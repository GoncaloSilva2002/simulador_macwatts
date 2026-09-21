const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");

const source = path.join(__dirname, "..", "public", "base.pdf");
const target = path.join(__dirname, "..", "public", "base-formulario.pdf");

const fields = [
  ["cliente", 555, 457, 55, 13],
  ["data", 550, 436, 55, 13],
  ["morada", 355, 436, 55, 13],
  ["numero_paineis", 375, 423, 55, 13],
  ["potencia", 358, 409, 55, 13],
  ["inversor", 356, 395, 55, 13],
  ["preco", 370, 339, 55, 13],
  ["producao", 370, 233, 55, 13],
  ["consumo", 370, 176, 55, 13],
  ["poupanca_mensal", 426, 90, 55, 13],
  ["poupanca_anual", 420, 76, 55, 13],
  ["poupanca_30_anos", 463, 62, 55, 13]
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
