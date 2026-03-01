# JSON to ABAP Converter

A web tool that converts JSON structures to SAP S/4HANA ABAP type definitions and deserialization code, following SAP best practices.

**Live:** [Deploy on Netlify](https://app.netlify.com) | **Repo:** [github.com/vikramsankhala/JSON2ABAP](https://github.com/vikramsankhala/JSON2ABAP)

## Contents

| File | Description |
|------|-------------|
| `index.html`, `app.js`, `styles.css` | Web converter (paste JSON → get ABAP) |
| `ABAP_STRUCTURE_RECOMMENDATION.md` | Recommended ABAP table structures for GST E-Invoice JSON |
| `abap/einvoice_json2abap.prog.abap` | Drop-in ABAP script for e-invoice deserialization |
| `samples/` | Sample JSON files |

## Features

- **ABAP TYPES generation**: Converts JSON objects to ABAP structure definitions
- **S/4HANA best practices**: Uses `xco_cp_json` (XCO library) for cloud-ready code
- **PascalCase → underscore**: Automatic field name transformation for JSON compatibility
- **Type inference**: Maps JSON types to ABAP types (`string`, `i`, `decfloat16`, `abap_bool`)
- **Nested structures & arrays**: Handles complex JSON with `STANDARD TABLE OF` for arrays
- **Deserialize call**: Generates the complete `from_string()->apply()->write_to()` pattern

## SAP Best Practices Applied

- **xco_cp_json**: Modern Cloud ABAP API (replaces legacy `cl_ui2/cl_json`)
- **PascalCase to underscore**: `pascal_case_to_underscore` transformation
- **Boolean conversion**: `boolean_to_abap_bool` for JSON true/false
- **decfloat16**: Decimal floating point for numeric precision (S/4HANA)
- **TRY-CATCH**: Proper exception handling with `cx_root`

## Deploy to Netlify via GitHub

### 1. Push to GitHub

```bash
cd json2abap-converter
git init
git add .
git commit -m "Initial commit: JSON to ABAP converter"
git branch -M main
git remote add origin https://github.com/vikramsankhala/JSON2ABAP.git
git push -u origin main
```

### 2. Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and authorize Netlify
4. Select your `JSON2ABAP` repository
5. Build settings (auto-detected from `netlify.toml`):
   - **Build command**: (empty or from config)
   - **Publish directory**: `.` (root)
6. Click **Deploy site**

### 3. Custom domain (optional)

In Netlify: **Site settings** → **Domain management** → **Add custom domain**

## Local Development

Open `index.html` in a browser, or use a local server:

```bash
npx serve .
# or
python -m http.server 8080
```

## Usage

1. Paste your JSON in the input area (or click **Load Sample**)
2. Click **Convert to ABAP**
3. Copy the generated ABAP code
4. Use the **TYPES**, **Deserialize Call**, or **Full Code** tabs to view specific sections

## Based On

- [Json2ABAP.md](../Json2ABAP.md) – Specification and e-invoice example
- SAP S/4HANA Cloud ABAP documentation
- XCO JSON conversion best practices

## License

MIT
