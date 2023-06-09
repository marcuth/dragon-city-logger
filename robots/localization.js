import axios from "axios"
import fs from "fs"

import state from "./state.js"

export default (async () => {
    console.log("> [localization-robot] Starting...")

    const content = state.load()

    content.localization = {}
    
    const newInformation = await requestLocalizationInformation()
    await compareNewInformationWithOld(content, newInformation)
    await saveNewInformation(newInformation)

    state.save(content)

    async function requestLocalizationInformation() {
        const data = await requestData()
        const dataObject = await joinArrayItemsInANewObject(data)

        return dataObject

        async function joinArrayItemsInANewObject(arrayItems) {
            console.log("> [localization-robot] Converting object array in a new object")

            const localizationObject = {}

            for (const item of arrayItems) {
                for (const key of Object.keys(item)) {
                    if (!Object.keys(localizationObject).includes(key)) {
                        localizationObject[key] = item[key]
                    } else {
                        throw new Error("> [localization-robot-error] Duplicate key in localization")
                    }
                }
            }
            
            return localizationObject
        }

        async function requestData(language = "en") {
            const url = `https://sp-translations.socialpointgames.com/deploy/dc/android/prod/dc_android_${language}_prod_wetd46pWuR8J5CmS.json`
            
            console.log(`> [localization-robot] Fetching data from the url: ${url}`)

            const response = await axios.get(url)

            return response.data
        }
    }

    async function compareNewInformationWithOld(content, newInformation) {
        console.log("> [localization-robot] Comparing new information with old information")

        const oldInformationFilePath = "data/localization.json"

        if (!fs.existsSync(oldInformationFilePath)) {
            content.localization.newKeys = []
            content.localization.editedValues = []

            return
        }

        const oldInformationString = fs.readFileSync(oldInformationFilePath)
        const oldInformation = JSON.parse(oldInformationString)
        
        content.localization.newKeys = await scanKeys() 
        content.localization.editedValues = await compareValues()

        async function scanKeys() {
            console.log("> [localization-robot] Looking for new keys")

            const newKeys = []

            const oldInformationKeys =  Object.keys(oldInformation)

            for (const key of Object.keys(newInformation)) {
                if (!oldInformationKeys.includes(key)) {
                    newKeys.push(key)
                }
            }

            return newKeys
        }

        async function compareValues() {
            console.log("> [localization-robot] Comparing key values")

            const editedValues = []

            for (const key of Object.keys(oldInformation)) {
                if (oldInformation[key] !== newInformation[key]) {
                    editedValues.push({
                        key: key,
                        oldValue: oldInformation[key],
                        newValue: newInformation[key]
                    })
                }
            }
            
            return editedValues
        }
    }

    async function saveNewInformation(newInformation) {
        console.log("> [localization-robot] Saving new data")
        
        const cacheFilePath = "data/localization.json"
        const newInformationString = JSON.stringify(newInformation)
        fs.writeFileSync(cacheFilePath, newInformationString)
    }
})