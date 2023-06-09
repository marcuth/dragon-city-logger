import fs from "fs"

const contentFilePath = "content.json"

function load() {
    const contentString = fs.readFileSync(contentFilePath)
    const content = JSON.parse(contentString)

    return content
}

function save(content) {
    const contentString = JSON.stringify(content)
    fs.writeFileSync(contentFilePath, contentString)
}

export default { load, save }