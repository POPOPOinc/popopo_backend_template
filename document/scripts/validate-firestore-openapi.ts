import { documents, generateSchema } from "../src/documents"

for (const [i, document] of documents.entries()) {
  try {
    generateSchema(document)
    console.log(`[${i + 1}/${documents.length}] ${document.path}`)
  } catch (error) {
    console.error(`Failed: ${document.path}`, error)
    process.exit(1)
  }
}
console.log("All documents validated successfully.")
