/**
 * Exportación de reportes a PDF y Excel (RF6).
 *
 * Genera el archivo en memoria a partir del reporte ya calculado. No conoce
 * Express ni SQL: recibe datos y devuelve un Buffer.
 */
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// ---------------------------------------------------------------------
// Formato de valores (independiente del ICU instalado en el servidor)
// ---------------------------------------------------------------------
const separarMiles = (entero) => entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const formatearNumero = (valor, decimales) => {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '';

    const [entero, fraccion] = Math.abs(numero).toFixed(decimales).split('.');
    const signo = numero < 0 ? '-' : '';

    return `${signo}${separarMiles(entero)}${fraccion ? `,${fraccion}` : ''}`;
};

const doble = (n) => String(n).padStart(2, '0');

// Componentes de fecha y hora de un instante en la zona de la farmacia.
const partesLocales = (valor, zonaHoraria) => {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: zonaHoraria,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(valor));

    const tomar = (tipo) => Number(partes.find((p) => p.type === tipo).value);

    return {
        anio: tomar('year'),
        mes: tomar('month'),
        dia: tomar('day'),
        hora: tomar('hour'),
        minuto: tomar('minute'),
        segundo: tomar('second'),
    };
};

// 'AAAA-MM-DD' (lo que entregan los repositorios) a partes de fecha.
const partesDeFechaTexto = (texto) => {
    const [anio, mes, dia] = String(texto).slice(0, 10).split('-').map(Number);
    return { anio, mes, dia };
};

// 'AAAA-MM-DD' del instante dado en la zona de la farmacia.
const fechaLocalISO = (valor, zonaHoraria) => {
    const p = partesLocales(valor, zonaHoraria);
    return `${p.anio}-${doble(p.mes)}-${doble(p.dia)}`;
};

const formatearFecha = (texto) => {
    if (!texto) return '';
    const p = partesDeFechaTexto(texto);
    return `${doble(p.dia)}/${doble(p.mes)}/${p.anio}`;
};

const formatearFechaHora = (valor, zonaHoraria) => {
    if (!valor) return '';
    const p = partesLocales(valor, zonaHoraria);
    return `${doble(p.dia)}/${doble(p.mes)}/${p.anio} ${doble(p.hora)}:${doble(p.minuto)}`;
};

const textoCelda = (columna, valor, zonaHoraria) => {
    if (valor === null || valor === undefined || valor === '') return '';

    switch (columna.tipo) {
    case 'moneda': return formatearNumero(valor, 2);
    case 'decimal': return formatearNumero(valor, 2);
    case 'entero': return formatearNumero(valor, 0);
    case 'fecha': return formatearFecha(valor);
    case 'fechahora': return formatearFechaHora(valor, zonaHoraria);
    default: return String(valor);
    }
};

const esNumerica = (columna) => ['moneda', 'decimal', 'entero'].includes(columna.tipo);

const textoFiltros = (definicion, filtros) => {
    if (definicion.sinRango) return 'Existencias vigentes al día de la emisión';

    const { fechaInicio, fechaFin } = filtros;
    const etiqueta = definicion.descripcionRango || 'Fecha';

    if (fechaInicio && fechaFin) {
        return `${etiqueta}: del ${formatearFecha(fechaInicio)} al ${formatearFecha(fechaFin)}`;
    }
    if (fechaInicio) return `${etiqueta}: desde el ${formatearFecha(fechaInicio)}`;
    if (fechaFin) return `${etiqueta}: hasta el ${formatearFecha(fechaFin)}`;

    return definicion.clave === 'lotes-por-vencer'
        ? `${etiqueta}: dentro del margen de alerta`
        : `${etiqueta}: todos`;
};

const lineaGeneracion = (meta) => (
    `Generado por ${meta.usuario} el ${formatearFechaHora(meta.generadoEn, meta.zonaHoraria)}`
);

// ---------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------
const FORMATOS_EXCEL = {
    moneda: '#,##0.00',
    decimal: '0.00',
    entero: '#,##0',
    fecha: 'dd/mm/yyyy',
    fechahora: 'dd/mm/yyyy hh:mm',
};

// Excel guarda fechas sin zona: se entrega la hora local como si fuera UTC.
const valorExcel = (columna, valor, zonaHoraria) => {
    if (valor === null || valor === undefined || valor === '') return null;

    if (esNumerica(columna)) return Number(valor);

    if (columna.tipo === 'fecha') {
        const p = partesDeFechaTexto(valor);
        return new Date(Date.UTC(p.anio, p.mes - 1, p.dia));
    }

    if (columna.tipo === 'fechahora') {
        const p = partesLocales(valor, zonaHoraria);
        return new Date(Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo));
    }

    return String(valor);
};

const generarExcel = async (reporte, meta) => {
    const { definicion, columnas, filas, totales, filtros } = reporte;
    const libro = new ExcelJS.Workbook();
    libro.creator = meta.farmacia.nombre || 'Farmacia';
    libro.created = new Date();

    const hoja = libro.addWorksheet(definicion.titulo.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 6 }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    hoja.columns = columnas.map((c) => ({ key: c.clave, width: Math.round(c.ancho * 14) }));

    const ultima = columnas.length;
    const fusionar = (fila) => hoja.mergeCells(fila, 1, fila, ultima);

    hoja.getCell(1, 1).value = meta.farmacia.nombre || 'Farmacia';
    hoja.getCell(1, 1).font = { bold: true, size: 14 };
    fusionar(1);

    hoja.getCell(2, 1).value = definicion.titulo;
    hoja.getCell(2, 1).font = { bold: true, size: 12 };
    fusionar(2);

    hoja.getCell(3, 1).value = textoFiltros(definicion, filtros);
    fusionar(3);

    hoja.getCell(4, 1).value = lineaGeneracion(meta);
    hoja.getCell(4, 1).font = { color: { argb: 'FF666666' }, size: 9 };
    fusionar(4);

    // Fila 5 en blanco; encabezado en la fila 6.
    const encabezado = hoja.getRow(6);
    columnas.forEach((c, i) => {
        const celda = encabezado.getCell(i + 1);
        celda.value = c.titulo;
        celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3D6AC1' } };
        celda.alignment = {
            vertical: 'middle',
            horizontal: esNumerica(c) ? 'right' : 'left',
            wrapText: true,
        };
    });
    encabezado.height = 24;

    filas.forEach((fila, indice) => {
        const excelFila = hoja.getRow(7 + indice);
        columnas.forEach((c, i) => {
            const celda = excelFila.getCell(i + 1);
            celda.value = valorExcel(c, fila[c.clave], meta.zonaHoraria);
            if (FORMATOS_EXCEL[c.tipo]) celda.numFmt = FORMATOS_EXCEL[c.tipo];
            celda.alignment = { horizontal: esNumerica(c) ? 'right' : 'left' };
        });
    });

    if (filas.length === 0) {
        hoja.getCell(7, 1).value = 'Sin registros para los filtros seleccionados.';
        hoja.getCell(7, 1).font = { italic: true, color: { argb: 'FF666666' } };
        fusionar(7);
    } else {
        const filaTotales = hoja.getRow(7 + filas.length);
        filaTotales.getCell(1).value = 'TOTAL';
        columnas.forEach((c, i) => {
            const celda = filaTotales.getCell(i + 1);
            if (totales[c.clave] !== undefined) {
                celda.value = totales[c.clave];
                celda.numFmt = FORMATOS_EXCEL[c.tipo];
                celda.alignment = { horizontal: 'right' };
            }
            celda.font = { bold: true };
            celda.border = { top: { style: 'thin' } };
        });

        hoja.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + filas.length, column: ultima } };
    }

    return Buffer.from(await libro.xlsx.writeBuffer());
};

// ---------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------
const COLOR_PRIMARIO = '#3d6ac1';
const COLOR_TEXTO = '#1f2937';
const COLOR_SUAVE = '#6b7280';

const generarPdf = (reporte, meta) => new Promise((resolve, reject) => {
    const { definicion, columnas, filas, totales, filtros } = reporte;
    const margen = 36;
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: margen,
        bufferPages: true,
        info: {
            Title: definicion.titulo,
            Author: meta.farmacia.nombre || 'Farmacia',
        },
    });

    const trozos = [];
    doc.on('data', (trozo) => trozos.push(trozo));
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);

    const anchoUtil = doc.page.width - margen * 2;
    const limiteInferior = doc.page.height - margen - 14;
    const sumaAnchos = columnas.reduce((suma, c) => suma + c.ancho, 0);
    const anchos = columnas.map((c) => (c.ancho / sumaAnchos) * anchoUtil);
    const relleno = 4;

    const dibujarCabeceraDocumento = () => {
        doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR_PRIMARIO)
            .text(meta.farmacia.nombre || 'Farmacia', margen, margen, { width: anchoUtil });

        const datosFarmacia = [
            meta.farmacia.nit ? `NIT ${meta.farmacia.nit}` : '',
            meta.farmacia.direccion || '',
            meta.farmacia.telefono ? `Tel. ${meta.farmacia.telefono}` : '',
        ].filter(Boolean).join('  |  ');

        if (datosFarmacia) {
            doc.font('Helvetica').fontSize(8).fillColor(COLOR_SUAVE)
                .text(datosFarmacia, margen, doc.y, { width: anchoUtil });
        }

        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_TEXTO)
            .text(definicion.titulo, margen, doc.y, { width: anchoUtil });
        doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXTO)
            .text(textoFiltros(definicion, filtros), margen, doc.y + 2, { width: anchoUtil });
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SUAVE)
            .text(lineaGeneracion(meta), margen, doc.y + 1, { width: anchoUtil });
        doc.moveDown(0.8);
    };

    const alturaFila = (celdas, fuente, tamano) => {
        doc.font(fuente).fontSize(tamano);
        const alto = Math.max(...celdas.map((texto, i) => (
            doc.heightOfString(texto || ' ', { width: anchos[i] - relleno * 2 })
        )));

        return alto + relleno * 2;
    };

    const dibujarFila = (celdas, y, alto, { fuente, tamano, color, fondo, linea }) => {
        if (fondo) {
            doc.rect(margen, y, anchoUtil, alto).fill(fondo);
        }

        doc.font(fuente).fontSize(tamano).fillColor(color);
        let x = margen;
        celdas.forEach((texto, i) => {
            doc.text(texto, x + relleno, y + relleno, {
                width: anchos[i] - relleno * 2,
                align: esNumerica(columnas[i]) ? 'right' : 'left',
            });
            x += anchos[i];
        });

        if (linea) {
            doc.moveTo(margen, y + alto).lineTo(margen + anchoUtil, y + alto)
                .lineWidth(0.5).strokeColor(linea).stroke();
        }
    };

    const estiloEncabezado = {
        fuente: 'Helvetica-Bold', tamano: 8.5, color: '#ffffff', fondo: COLOR_PRIMARIO,
    };
    const dibujarEncabezadoTabla = () => {
        const textos = columnas.map((c) => c.titulo);
        const alto = alturaFila(textos, estiloEncabezado.fuente, estiloEncabezado.tamano);
        const y = doc.y;
        dibujarFila(textos, y, alto, estiloEncabezado);
        doc.y = y + alto;
    };

    dibujarCabeceraDocumento();

    if (filas.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLOR_SUAVE)
            .text('Sin registros para los filtros seleccionados.', margen, doc.y, { width: anchoUtil });
    } else {
        dibujarEncabezadoTabla();

        filas.forEach((fila, indice) => {
            const textos = columnas.map((c) => textoCelda(c, fila[c.clave], meta.zonaHoraria));
            const alto = alturaFila(textos, 'Helvetica', 8.5);

            if (doc.y + alto > limiteInferior) {
                doc.addPage();
                doc.y = margen;
                dibujarEncabezadoTabla();
            }

            const y = doc.y;
            dibujarFila(textos, y, alto, {
                fuente: 'Helvetica',
                tamano: 8.5,
                color: COLOR_TEXTO,
                fondo: indice % 2 === 1 ? '#f3f4f8' : null,
                linea: '#e5e7eb',
            });
            doc.y = y + alto;
        });

        const textosTotales = columnas.map((c, i) => {
            if (i === 0) return 'TOTAL';
            return totales[c.clave] !== undefined ? textoCelda(c, totales[c.clave]) : '';
        });
        const altoTotales = alturaFila(textosTotales, 'Helvetica-Bold', 9);

        if (doc.y + altoTotales > limiteInferior) {
            doc.addPage();
            doc.y = margen;
        }

        const yTotales = doc.y;
        dibujarFila(textosTotales, yTotales, altoTotales, {
            fuente: 'Helvetica-Bold',
            tamano: 9,
            color: COLOR_TEXTO,
            fondo: '#e8edf9',
        });
        doc.y = yTotales + altoTotales;

        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SUAVE)
            .text(`${filas.length} registro${filas.length === 1 ? '' : 's'}`, margen, doc.y + 6, { width: anchoUtil });
    }

    // Numeración de páginas. Se baja el margen inferior a 0 para que escribir
    // en el pie no provoque un salto de página automático.
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i += 1) {
        doc.switchToPage(rango.start + i);
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_SUAVE).text(
            `Página ${i + 1} de ${rango.count}`,
            margen,
            doc.page.height - margen + 6,
            { width: anchoUtil, align: 'right', lineBreak: false }
        );
    }

    doc.end();
});

module.exports = {
    generarExcel,
    generarPdf,
    fechaLocalISO,
    // Expuestos para las pruebas unitarias.
    formatearNumero,
    formatearFecha,
    formatearFechaHora,
};
