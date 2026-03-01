/**
 * JSON to ABAP Converter
 * SAP S/4HANA Best Practices - xco_cp_json, PascalCase to underscore
 * Based on Json2ABAP.md specifications
 */

(function () {
  'use strict';

  const SAMPLE_JSON = {
    TranDtls: { TaxSch: 'GST', Suptyp: 'B2B', RegRev: 'N', IgstOnIntra: 'N' },
    DocDtls: { Typ: 'INV', No: '3040000100', Dt: '27/02/2026' },
    SellerDtls: { Gstin: '19AACCN6958P1ZI', LglNm: 'Naba Diganta Water Management Limited' },
    BuyerDtls: { Gstin: '19AAACW2411Q1Z1', LglNm: 'WBEIDC Ltd', Pos: '19' },
    ItemList: [
      { ItemNo: 1, SlNo: '1', HsnCd: '996921', Qty: 3007, UnitPrice: 51.52, TotAmt: 155108.52, GstRt: 18 },
      { ItemNo: 2, SlNo: '2', HsnCd: '998633', Qty: 3007, UnitPrice: 0, TotAmt: 0 }
    ],
    ValDtls: { AssVal: 155108.52, CgstVal: 13959.77, SgstVal: 13959.77, TotInvVal: 183028.06 }
  };

  const DOM = {
    jsonInput: document.getElementById('json-input'),
    abapCode: document.getElementById('abap-code'),
    errorMessage: document.getElementById('error-message'),
    btnConvert: document.getElementById('btn-convert'),
    btnValidate: document.getElementById('btn-validate'),
    btnSample: document.getElementById('btn-sample'),
    btnCopy: document.getElementById('btn-copy'),
    tabs: document.querySelectorAll('.tab')
  };

  let lastOutput = { types: '', deserialize: '', full: '' };

  /**
   * Convert PascalCase to snake_case (ABAP convention)
   */
  function pascalToUnderscore(str) {
    return str
      .replace(/([A-Z])/g, (m) => '_' + m.toLowerCase())
      .replace(/^_/, '')
      .replace(/\s+/g, '_');
  }

  /**
   * Sanitize ABAP identifier (alphanumeric + underscore)
   */
  function toAbapName(str) {
    return pascalToUnderscore(str).replace(/[^a-z0-9_]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'field';
  }

  /**
   * Infer ABAP type from JSON value
   */
  function inferAbapType(value) {
    if (value === null) return 'string';
    if (typeof value === 'boolean') return 'abap_bool';
    if (typeof value === 'number') return Number.isInteger(value) ? 'i' : 'decfloat16';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  /**
   * Get unique type name for nested structure
   */
  function getTypeName(prefix, key, index = 0) {
    const base = 'ty_' + toAbapName(key);
    return index > 0 ? `${base}_${index}` : base;
  }

  /**
   * Generate ABAP TYPES for a JSON object
   */
  function generateTypes(obj, prefix = '', typeNameMap = new Map()) {
    const lines = [];
    const keys = Object.keys(obj);

    for (const key of keys) {
      const value = obj[key];
      const abapField = toAbapName(key);
      const type = inferAbapType(value);

      if (type === 'object') {
        const subTypeName = getTypeName(prefix, key);
        if (!typeNameMap.has(subTypeName)) {
          typeNameMap.set(subTypeName, true);
          const subLines = generateTypes(value, subTypeName + '_', typeNameMap);
          lines.push(...subLines);
        }
        lines.push(`         ${abapField.padEnd(24)} TYPE ${getTypeName(prefix, key)},`);
      } else if (type === 'array') {
        const first = value[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
          const itemTypeName = getTypeName(prefix, key) + '_item';
          if (!typeNameMap.has(itemTypeName)) {
            typeNameMap.set(itemTypeName, true);
            const subLines = generateTypes(first, itemTypeName + '_', typeNameMap);
            lines.push(...subLines);
          }
          const tabTypeName = itemTypeName + '_tab';
          if (!typeNameMap.has(tabTypeName)) {
            typeNameMap.set(tabTypeName, true);
            lines.push(`TYPES: ${tabTypeName} TYPE STANDARD TABLE OF ${itemTypeName} WITH DEFAULT KEY.`);
          }
          lines.push(`         ${abapField.padEnd(24)} TYPE ${tabTypeName},`);
        } else {
          const elemType = first !== undefined ? inferAbapType(first) : 'string';
          const abapType = elemType === 'i' ? 'i' : elemType === 'decfloat16' ? 'decfloat16' : 'string';
          lines.push(`         ${abapField.padEnd(24)} TYPE STANDARD TABLE OF ${abapType} WITH DEFAULT KEY,`);
        }
      } else {
        const abapType = type === 'abap_bool' ? 'abap_bool' : type === 'i' ? 'i' : type === 'decfloat16' ? 'decfloat16' : 'string';
        lines.push(`         ${abapField.padEnd(24)} TYPE ${abapType},`);
      }
    }

    if (lines.length > 0) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/,\s*$/, '.');
    }

    return lines;
  }

  /**
   * Generate full TYPES block for root object
   */
  function generateFullTypes(obj, rootName = 'ty_payload') {
    const typeNameMap = new Map();
    const fieldLines = generateTypes(obj, rootName + '_', typeNameMap);

    const begin = `TYPES: BEGIN OF ${rootName},`;
    const end = `       END OF ${rootName}.`;
    const body = fieldLines.map(line => `  ${line}`).join('\n');

    const allTypes = [];
    const seen = new Set();

    function collectTypes(acc) {
      for (const line of acc) {
        const match = line.match(/TYPE (ty_\w+)/);
        if (match && !seen.has(match[1])) {
          seen.add(match[1]);
        }
      }
    }

    const fullBlock = [begin, body, end].join('\n');

    const ordered = [];
    const tabMatches = fullBlock.match(/TYPE (ty_\w+_tab)/g) || [];
    const itemMatches = fullBlock.match(/TYPE (ty_\w+_item)/g) || [];
    const structMatches = fullBlock.match(/TYPE (ty_\w+)/g) || [];

    const allRefs = [...new Set([...tabMatches, ...itemMatches, ...structMatches].map(m => m.replace('TYPE ', '')))];

    for (const ref of allRefs) {
      if (ref.endsWith('_tab')) {
        const base = ref.replace('_tab', '');
        if (!seen.has(base) && allRefs.some(r => r === base)) {
          const itemObj = findNestedObject(obj, ref.replace('ty_', '').replace(/_tab$/, '').replace(/_/g, ''));
          if (itemObj) {
            const sub = generateTypes(itemObj, base + '_', new Map());
            ordered.push(`TYPES: BEGIN OF ${base},`);
            ordered.push(...sub.map(s => s.trim()));
            ordered.push(`       END OF ${base}.`);
            ordered.push(`TYPES: ${ref} TYPE STANDARD TABLE OF ${base} WITH DEFAULT KEY.`);
            seen.add(base);
            seen.add(ref);
          }
        }
      }
    }

    const simple = generateTypesRecursive(obj, 'ty_payload', new Map(), []);
    return simple.join('\n\n');
  }

  function findNestedObject(obj, path) {
    const parts = path.split('_').filter(Boolean);
    let current = obj;
    for (const p of parts) {
      const key = Object.keys(current).find(k => toAbapName(k) === p) || Object.keys(current)[0];
      if (!key) return null;
      current = current[key];
      if (Array.isArray(current)) current = current[0] || {};
    }
    return typeof current === 'object' && !Array.isArray(current) ? current : null;
  }

  /**
   * Recursive type generation with proper ordering
   */
  function generateTypesRecursive(obj, parentName, typeNameMap, acc) {
    const keys = Object.keys(obj);

    for (const key of keys) {
      const value = obj[key];
      const abapField = toAbapName(key);
      const type = inferAbapType(value);

      if (type === 'object') {
        const subTypeName = getTypeName('', key);
        if (!typeNameMap.has(subTypeName)) {
          typeNameMap.set(subTypeName, true);
          acc.push(`TYPES: BEGIN OF ${subTypeName},`);
          const subLines = [];
          for (const sk of Object.keys(value)) {
            const sv = value[sk];
            const sAbap = toAbapName(sk);
            const sType = inferAbapType(sv);
            if (sType === 'object') {
              const subSub = getTypeName('', sk);
              if (!typeNameMap.has(subSub)) {
                typeNameMap.set(subSub, true);
                generateTypesRecursive(sv, subSub, typeNameMap, acc);
              }
              subLines.push(`         ${sAbap.padEnd(24)} TYPE ${subSub},`);
            } else if (sType === 'array') {
              const first = sv[0];
              if (first && typeof first === 'object') {
                const itemName = getTypeName('', key) + '_item';
                if (!typeNameMap.has(itemName)) {
                  typeNameMap.set(itemName, true);
                  acc.push(`TYPES: BEGIN OF ${itemName},`);
                  const itemLines = [];
                  for (const ik of Object.keys(first)) {
                    const it = inferAbapType(first[ik]);
                    const abapT = it === 'i' ? 'i' : it === 'decfloat16' ? 'decfloat16' : it === 'abap_bool' ? 'abap_bool' : 'string';
                    itemLines.push(`         ${toAbapName(ik).padEnd(24)} TYPE ${abapT},`);
                  }
                  if (itemLines.length) itemLines[itemLines.length - 1] = itemLines[itemLines.length - 1].replace(/,\s*$/, '.');
                  acc.push(...itemLines);
                  acc.push(`       END OF ${itemName}.`);
                  acc.push(`TYPES: ${itemName}_tab TYPE STANDARD TABLE OF ${itemName} WITH DEFAULT KEY.`);
                }
                subLines.push(`         ${sAbap.padEnd(24)} TYPE ${getTypeName('', key)}_item_tab,`);
              } else {
                const elemT = first !== undefined ? inferAbapType(first) : 'string';
                const abapT = elemT === 'i' ? 'i' : elemT === 'decfloat16' ? 'decfloat16' : 'string';
                subLines.push(`         ${sAbap.padEnd(24)} TYPE STANDARD TABLE OF ${abapT} WITH DEFAULT KEY,`);
              }
            } else {
              const abapT = sType === 'i' ? 'i' : sType === 'decfloat16' ? 'decfloat16' : sType === 'abap_bool' ? 'abap_bool' : 'string';
              subLines.push(`         ${sAbap.padEnd(24)} TYPE ${abapT},`);
            }
          }
          if (subLines.length) subLines[subLines.length - 1] = subLines[subLines.length - 1].replace(/,\s*$/, '.');
          acc.push(...subLines);
          acc.push(`       END OF ${subTypeName}.`);
        }
      } else if (type === 'array') {
        const first = value[0];
        const itemTypeName = getTypeName('', key) + '_item';
        if (first && typeof first === 'object' && !typeNameMap.has(itemTypeName)) {
          typeNameMap.set(itemTypeName, true);
          acc.push(`TYPES: BEGIN OF ${itemTypeName},`);
          const itemLines = [];
          for (const ik of Object.keys(first)) {
            const it = inferAbapType(first[ik]);
            const abapT = it === 'i' ? 'i' : it === 'decfloat16' ? 'decfloat16' : it === 'abap_bool' ? 'abap_bool' : 'string';
            itemLines.push(`         ${toAbapName(ik).padEnd(24)} TYPE ${abapT},`);
          }
          if (itemLines.length) itemLines[itemLines.length - 1] = itemLines[itemLines.length - 1].replace(/,\s*$/, '.');
          acc.push(...itemLines);
          acc.push(`       END OF ${itemTypeName}.`);
          acc.push(`TYPES: ${itemTypeName}_tab TYPE STANDARD TABLE OF ${itemTypeName} WITH DEFAULT KEY.`);
        }
      }
    }

    acc.push(`TYPES: BEGIN OF ${parentName},`);
    const fieldLines = [];
    for (const key of keys) {
      const value = obj[key];
      const abapField = toAbapName(key);
      const type = inferAbapType(value);
      if (type === 'object') {
        fieldLines.push(`         ${abapField.padEnd(24)} TYPE ${getTypeName('', key)},`);
      } else if (type === 'array') {
        const first = value[0];
        if (first && typeof first === 'object') {
          fieldLines.push(`         ${abapField.padEnd(24)} TYPE ${getTypeName('', key)}_item_tab,`);
        } else {
          const elemT = first !== undefined ? inferAbapType(first) : 'string';
          const abapT = elemT === 'i' ? 'i' : elemT === 'decfloat16' ? 'decfloat16' : 'string';
          fieldLines.push(`         ${abapField.padEnd(24)} TYPE STANDARD TABLE OF ${abapT} WITH DEFAULT KEY,`);
        }
      } else {
        const abapT = type === 'i' ? 'i' : type === 'decfloat16' ? 'decfloat16' : type === 'abap_bool' ? 'abap_bool' : 'string';
        fieldLines.push(`         ${abapField.padEnd(24)} TYPE ${abapT},`);
      }
    }
    if (fieldLines.length) fieldLines[fieldLines.length - 1] = fieldLines[fieldLines.length - 1].replace(/,\s*$/, '.');
    acc.push(...fieldLines);
    acc.push(`       END OF ${parentName}.`);

    return acc;
  }

  /**
   * Build types with correct dependency order
   */
  function buildTypes(obj) {
    const typeNameMap = new Map();
    const fragments = [];
    const rootName = 'ty_payload';

    function processObject(o, structName) {
      const nested = [];
      const fields = [];

      for (const key of Object.keys(o)) {
        const value = o[key];
        const abapField = toAbapName(key);
        const type = inferAbapType(value);

        if (type === 'object') {
          const subName = 'ty_' + toAbapName(key);
          if (!typeNameMap.has(subName)) {
            typeNameMap.set(subName, true);
            processObject(value, subName);
          }
          fields.push({ name: abapField, type: subName });
        } else if (type === 'array') {
          const first = value[0];
          if (first && typeof first === 'object') {
            const itemName = 'ty_' + toAbapName(key) + '_item';
            const tabName = itemName + '_tab';
            if (!typeNameMap.has(itemName)) {
              typeNameMap.set(itemName, true);
              typeNameMap.set(tabName, true);
              processObject(first, itemName);
              fragments.push(`TYPES: ${tabName} TYPE STANDARD TABLE OF ${itemName} WITH DEFAULT KEY.`);
            }
            fields.push({ name: abapField, type: tabName });
          } else {
            const elemT = first !== undefined ? inferAbapType(first) : 'string';
            const abapT = elemT === 'i' ? 'i' : elemT === 'decfloat16' ? 'decfloat16' : 'string';
            fields.push({ name: abapField, type: `STANDARD TABLE OF ${abapT} WITH DEFAULT KEY` });
          }
        } else {
          const abapT = type === 'i' ? 'i' : type === 'decfloat16' ? 'decfloat16' : type === 'abap_bool' ? 'abap_bool' : 'string';
          fields.push({ name: abapField, type: abapT });
        }
      }

      let block = `TYPES: BEGIN OF ${structName},\n`;
      for (const f of fields) {
        block += `         ${f.name.padEnd(24)} TYPE ${f.type},\n`;
      }
      block = block.replace(/,\n$/, '.\n');
      block += `       END OF ${structName}.`;
      fragments.push(block);
    }

    processObject(obj, rootName);

    return fragments.join('\n\n');
  }

  /**
   * Generate XCO deserialize call (S/4HANA best practice)
   */
  function generateDeserializeCall(structName = 'ty_payload') {
    const varName = 'ls_' + structName.replace('ty_', '');
    return `DATA: lv_json_string TYPE string,
      ${varName} TYPE ${structName}.

" lv_json_string = <your JSON text>.

TRY.
    xco_cp_json=>data
      ->from_string( lv_json_string )
      ->apply( VALUE #(
          ( xco_cp_json=>transformation->pascal_case_to_underscore )
          ( xco_cp_json=>transformation->boolean_to_abap_bool )
        ) )
      ->write_to( REF #( ${varName} ) ).
  CATCH cx_root INTO DATA(lx_root).
    MESSAGE lx_root->get_text( ) TYPE 'E'.
ENDTRY.`;
  }

  /**
   * Main convert function
   */
  function convert() {
    hideError();
    const input = DOM.jsonInput.value.trim();

    if (!input) {
      showError('Please enter JSON to convert.');
      return;
    }

    let obj;
    try {
      obj = JSON.parse(input);
    } catch (e) {
      showError('Invalid JSON: ' + e.message);
      return;
    }

    if (typeof obj !== 'object' || obj === null) {
      showError('JSON root must be an object.');
      return;
    }

    const types = buildTypes(obj);
    const deserialize = generateDeserializeCall('ty_payload');
    const full = `*----------------------------------------------------------------------*
* JSON to ABAP - S/4HANA Best Practices (xco_cp_json)
*----------------------------------------------------------------------*

${types}

*----------------------------------------------------------------------*
* Deserialize call
*----------------------------------------------------------------------*

${deserialize}`;

    lastOutput = { types, deserialize, full };
    DOM.abapCode.textContent = full;
    switchTab('full');
  }

  function switchTab(tabId) {
    DOM.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    const content = lastOutput[tabId] || lastOutput.full;
    DOM.abapCode.textContent = content;
  }

  function showError(msg) {
    DOM.errorMessage.textContent = msg;
    DOM.errorMessage.classList.add('visible');
  }

  function hideError() {
    DOM.errorMessage.classList.remove('visible');
  }

  function loadSample() {
    DOM.jsonInput.value = JSON.stringify(SAMPLE_JSON, null, 2);
    hideError();
  }

  function validateJson() {
    hideError();
    try {
      JSON.parse(DOM.jsonInput.value);
      showError('JSON is valid.');
      DOM.errorMessage.style.color = 'var(--success)';
      DOM.errorMessage.style.borderColor = 'var(--success)';
      DOM.errorMessage.style.background = 'rgba(63, 185, 80, 0.1)';
      setTimeout(() => {
        DOM.errorMessage.classList.remove('visible');
        DOM.errorMessage.style = '';
      }, 2000);
    } catch (e) {
      showError('Invalid JSON: ' + e.message);
    }
  }

  function copyToClipboard() {
    const text = DOM.abapCode.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = DOM.btnCopy;
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  }

  DOM.btnConvert.addEventListener('click', convert);
  DOM.btnSample.addEventListener('click', loadSample);
  DOM.btnValidate.addEventListener('click', validateJson);
  DOM.btnCopy.addEventListener('click', copyToClipboard);

  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  DOM.jsonInput.addEventListener('input', hideError);
})();
