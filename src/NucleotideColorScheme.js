export default class NucleotideColorScheme {
  constructor(dataSet) {
    this.dataSet = dataSet;
    this.stateTable = this.dataSet.stateTable;

    this.colors = {
      greenLight: 'rgb(171,255,171)',
      greenDark: 'rgb(86,179,86)',
      redLight: 'rgb(255,171,171)',
      redDark: 'rgb(179,86,86)',
      blueLight: 'rgb(171,171,255)',
      blueDark: 'rgb(86,86,179)',
      orangeLight: 'rgb(255,228,171)',
      orangeDark: 'rgb(179,114,86)',
      white: 'rgb(255,255,255)',
      greyLight: 'rgb(210,210,210)',
      greyDark: 'rgb(192,192,192)',
    };

    this.colorMap = new Map();
    this.colorMap.set('A', { light: this.colors.greenLight, dark: this.colors.greenDark });
    this.colorMap.set('C', { light: this.colors.orangeLight, dark: this.colors.orangeDark });
    this.colorMap.set('G', { light: this.colors.redLight, dark: this.colors.redDark });
    this.colorMap.set('T', { light: this.colors.blueLight, dark: this.colors.blueDark });
    this.colorMap.set('', { light: this.colors.white, dark: this.colors.white });
    this.colorMap.set('-', { light: this.colors.greyLight, dark: this.colors.greyDark });
    this.colorMap.set('+', { light: this.colors.greyLight, dark: this.colors.greyDark });

    this.colorStamps = [];
  }

  getState(germplasm, chromosome, marker) {
    const geno = this.dataSet.genotypeFor(germplasm, chromosome, marker);
    return this.colorStamps[geno];
  }

  // Generates a set of homozygous and heterozygous color stamps from the stateTable
  setupColorStamps(size, font, fontSize) {
    this.colorStamps = [];
    this.stateTable.forEach((value, genotype) => {
      let stamp;
      if (genotype.isHomozygous) {
        stamp = this.drawGradientSquare(size, genotype, font, fontSize);
      } else {
        stamp = this.drawHetSquare(size, genotype, font, fontSize);
      }
      this.colorStamps.push(stamp);
    });
  }

  getAlleleColor(allele) {
	let color = this.colorMap.get(allele);
	return color == null ? this.colorMap.get("-") : color;
  }

  drawGradientSquare(size, genotype, font, fontSize) {
    const color = this.getAlleleColor(genotype.allele1);
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, color.light);
    lingrad.addColorStop(1, color.dark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.fillRect(0, 0, size, size);

    gradientCtx.fillStyle = 'rgb(0,0,0)';
    gradientCtx.font = font;
    if (size >= 10) {
      const textWidth = gradientCtx.measureText(genotype.allele1).width;
      gradientCtx.fillText(genotype.getText(), (size - textWidth) / 2, (size - (fontSize / 2)));
    }

    return gradCanvas;
  }

  drawHetSquare(size, genotype, font, fontSize) {
    const color1 = this.getAlleleColor(genotype.allele1);
    const color2 = this.getAlleleColor(genotype.allele2);
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = size;
    gradCanvas.height = size;
    const gradientCtx = gradCanvas.getContext('2d');

    const lingrad = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad.addColorStop(0, color1.light);
    lingrad.addColorStop(1, color1.dark);
    gradientCtx.fillStyle = lingrad;
    gradientCtx.beginPath();
    gradientCtx.lineTo(size, 0);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(0, 0);
    gradientCtx.fill();

    const lingrad2 = gradientCtx.createLinearGradient(0, 0, size, size);
    lingrad2.addColorStop(0, color2.light);
    lingrad2.addColorStop(1, color2.dark);
    gradientCtx.fillStyle = lingrad2;
    gradientCtx.beginPath();
    gradientCtx.moveTo(size, 0);
    gradientCtx.lineTo(size, size);
    gradientCtx.lineTo(0, size);
    gradientCtx.lineTo(size, 0);
    gradientCtx.fill();

    gradientCtx.fillStyle = 'rgb(0,0,0)';
    gradientCtx.font = font;
    if (size >= 10) {
      const allele1Width = gradientCtx.measureText(genotype.allele1).width;
      gradientCtx.fillText(genotype.allele1, ((size / 2) - allele1Width) / 2, fontSize);
      const allele2Width = gradientCtx.measureText(genotype.allele2).width;
      gradientCtx.fillText(genotype.allele2, size - ((size / 2) + allele2Width) / 2, size - (fontSize / 4));
    }

    return gradCanvas;
  }
}
