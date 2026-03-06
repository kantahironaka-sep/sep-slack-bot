class Anonymizer {
  constructor() {
    this.mappings = new Map();
    this.counter = 0;
  }
  anonymize(text) {
    let result = text;
    this.mappings.clear();
    this.counter = 0;
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (m) => {
      const k = "[EMAIL_" + (++this.counter) + "]"; this.mappings.set(k, m); return k;
    });
    result = result.replace(/0\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{3,4}/g, (m) => {
      const k = "[TEL_" + (++this.counter) + "]"; this.mappings.set(k, m); return k;
    });
    result = result.replace(/〒?\d{3}[-]?\d{4}[^\n]*/g, (m) => {
      const k = "[ADDR_" + (++this.counter) + "]"; this.mappings.set(k, m); return k;
    });
    const jpName = result.match(/([一-龥ぁ-んァ-ヶ]{1,4}[\s　]+[一-龥ぁ-んァ-ヶ]{1,4})/);
    if (jpName) { this.mappings.set("候補者X", jpName[1]); result = result.replaceAll(jpName[1], "候補者X"); }
    if (!this.mappings.has("候補者X")) {
      const enName = result.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (enName) { this.mappings.set("候補者X", enName[1]); result = result.replaceAll(enName[1], "候補者X"); }
    }
    return result;
  }
  restore(text) {
    let result = text;
    for (const [k, v] of this.mappings) result = result.replaceAll(k, v);
    return result;
  }
  getOriginalName() { return this.mappings.get("候補者X") || "不明"; }
}
module.exports = { Anonymizer };
