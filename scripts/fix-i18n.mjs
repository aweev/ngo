import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGES_DIR = join('/root/apps/ngo/messages');
const locales = ['ar', 'de', 'es', 'fr']; // en.json is the source of truth

const titleRequired = "title_required";
const amountRequired = "amount_required";
const checkingDupes = "checking_dupes";
const titleRequiredVal = "Please enter an expense title.";
const amountRequiredVal = "Please enter an expense amount.";
const checkingDupesVal = "Checking for possible duplicates…";

for (const locale of locales) {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  let data = JSON.parse(readFileSync(filePath, 'utf8'));
  
  let modified = false;
  
  // 1. Add missing title_required and amount_required to Admin.Financial.expenseForm
  // The expenseForm already exists - just add the two missing keys
  if (data.Admin && data.Admin.Financial && data.Admin.Financial.expenseForm) {
    const expenseForm = data.Admin.Financial.expenseForm;
    if (!expenseForm[titleRequired]) {
      expenseForm[titleRequired] = titleRequiredVal;
      modified = true;
      console.log(`${locale}: Added title_required to expenseForm`);
    }
    if (!expenseForm[amountRequired]) {
      expenseForm[amountRequired] = amountRequiredVal;
      modified = true;
      console.log(`${locale}: Added amount_required to expenseForm`);
    }
  } else {
    console.log(`${locale}: Admin.Financial.expenseForm structure not found, skipping`);
  }
  
  // 2. Add Field.checking_dupes if missing
  if (data.Field) {
    if (!data.Field[checkingDupes]) {
      data.Field[checkingDupes] = checkingDupesVal;
      modified = true;
      console.log(`${locale}: Added checking_dupes to Field`);
    }
  } else {
    // Create Field object with checking_dupes
    data.Field = {
      [checkingDupes]: checkingDupesVal
    };
    modified = true;
    console.log(`${locale}: Created Field with checking_dupes`);
  }
  
  if (modified) {
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  Written ${filePath}`);
  } else {
    console.log(`${locale}: No changes needed`);
  }
}

console.log('\nDone! Running verification...');