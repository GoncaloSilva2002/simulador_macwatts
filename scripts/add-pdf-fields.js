const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");

const source = path.join(__dirname, "..", "public", "base.pdf");
const target = path.join(__dirname, "..", "public", "base-formulario.pdf");

const fields = [
  ["cliente", 560, 440, 120, 13],
  ["data", 560, 418, 120, 13],
  ["morada", 330, 424, 220, 13],
  ["numero_paineis", 330, 404, 55, 13],
  ["potencia", 330, 384, 75, 13],
  ["inversor", 330, 364, 170, 13],
  ["preco", 390, 333, 55, 13],
  ["producao", 390, 216, 75, 13],
  ["consumo", 390, 155, 75, 13],
  ["poupanca_mensal", 440, 85, 70, 13],
  ["poupanca_anual", 440, 67, 70, 13],
  ["poupanca_30_anos", 440, 49, 70, 13]
];

(async () => {
  const pdf = await PDFDocument.load(fs.readFileSync(source));
  const page = pdf.getPages()[0];
  const form = pdf.getForm();
  for (const [name, x, y, width, height] of fields) {
    const field = form.createTextField(name);
    field.addToPage(page, {
      x, y, width, height,
      borderColor: rgb(0.2, 0.6, 0.5),
      borderWidth: 0,
      textColor: rgb(0.05, 0.08, 0.14)
    });
    field.setFontSize(10);
  }
  fs.writeFileSync(target, await pdf.save());
  console.log(`Criado: ${target}`);
})();
