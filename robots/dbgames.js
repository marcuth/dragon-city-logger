import htmlParser from "node-html-parser"
import axios from "axios"
import queryString from "node:querystring"
import fs from "fs"

import state from "./state.js"

export default (async () => {
    console.log("> [dbgames-robot] Starting...")

    const content = state.load()

    const dbgamesInformation = {}
    const dbgamesBaseUrl = "https://dbgames.info/dragoncity"

    await requestAndParseDragonPagesInformation()
    await saveInformation()

    async function getPageDOMDocument(pageUrl, options = null) {
        if (!options) options  = {}

        if (options.params) {
            console.log(`> [dbgames-robot] Fetching html page from the url: ${pageUrl}/?${queryString.stringify(options.params)}`)
        } else {
            console.log(`> [dbgames-robot] Fetching html page from the url: ${pageUrl}/`)
        }
        
        const response = await requestAndReturnPageInformation(pageUrl, options)
        const DOMDocument = await convertAndReturnPageTextToDOM(response)

        return DOMDocument

        async function requestAndReturnPageInformation(pageUrl, options) {
            const response = await axios.get(pageUrl, options)
            return response.data
        }

        async function convertAndReturnPageTextToDOM(pageText) {
            const DOMDocument = htmlParser.parse(pageText)
            return DOMDocument
        }
    }

    async function requestAndParseDragonPagesInformation() {
        console.log("> [dbgames-robot] Requesting page and parsing data from All dragons")

        const url = `${dbgamesBaseUrl}/dragons`
        const requestOptions = {
            params: { rarity: "common,rare,very rare,epic,legendary,heroic" },
            headers: { "Accept-Encoding": "gzip,deflate,compress" }
        }

        const totalOfPages = await getTotalOfPages()
        
        const information = []

        for (let pageNumber = 1; pageNumber <= totalOfPages; pageNumber++) {
            const newDragons = await requestAndParseAndReturnDragonPageInformation(pageNumber)
            information.push(...newDragons)
        }

        dbgamesInformation.dragons = information

        async function getTotalOfPages() {
            requestOptions.params.p = 1
            const document = await getPageDOMDocument(url, requestOptions)
            const $lastPageLink = document.querySelector(".prwr-hrz+ .listlink a:nth-child(17)")
            const totalOfPages = getPageNumber($lastPageLink)

            return totalOfPages

            async function getPageNumber($pageLink) {
                const pageNumber = Number($pageLink.attributes.href.split("p=")[1])
                return pageNumber
            }
        }       

        async function requestAndParseAndReturnDragonPageInformation(pageNumber) {
            requestOptions.params.p = pageNumber
            const document = await getPageDOMDocument(url, requestOptions)
 
            const $dragons = document.querySelectorAll(".result-data")

            const dragons = []

            for (const $dragon of $dragons) {
                const dragon = await parseAndReturnDragon($dragon)
                dragons.push(dragon)
            }

            return dragons

            async function parseAndReturnDragon($dragon) {
                const $dragonHeader = $dragon.querySelector(".subtitle:first-child")
                const $dragonName = $dragonHeader.querySelector("a")
                const $dragonDescription = $dragon.querySelector(".col-sm-12.rhs.text-data")
                const $dragonRarity = $dragon.querySelector(".rarity .iconized-text")
                const $dragonElements = $dragon.querySelectorAll(".element")
                const $dragonBreedingTime = $dragon.querySelector("tr:nth-child(3) .iconized-text")
                const $dragonHatchingTime = $dragon.querySelector("tr:nth-child(4) .iconized-text")
                const $dragonGoldProductionIncome = $dragon.querySelector("tr:nth-child(5) .iconized-text")
                const $dragonFirstImage = $dragon.querySelector(".col-xs-4:nth-child(1) .entityimg")
                const $dragonXpOnHatching = $dragon.querySelector("tr:nth-child(6) .iconized-text")

                const dragon = {}

                dragon.id = await parseAndReturnDragonId($dragonHeader)
                dragon.name = await parseAndReturnDragonName($dragonName)
                dragon.description = await parseAndReturnDragonDescription($dragonDescription)
                dragon.rarity = await parseAndReturnDragonRarity($dragonRarity)
                dragon.elements = await parseAndReturnDragonElements($dragonElements)
                dragon.breedingTime = await parseAndReturnDragonBreedingTime($dragonBreedingTime)
                dragon.hatchingTime = await parseAndReturnDragonHatchingTime($dragonHatchingTime)
                dragon.goldProductionIncome = await parseAndReturnDragonGoldProductionIncome($dragonGoldProductionIncome)
                dragon.xpOnHatching = await parseAndReturnDragonXpOnHatching($dragonXpOnHatching)
                dragon.imgName = await parseAndReturnDragonImageName($dragonFirstImage)
                dragon.pageUrl = await parseAndReturnDragonPageUrl($dragonName)

                return dragon

                async function parseAndReturnDragonId($dragonHeader) {
                    const id = Number($dragonHeader.textContent.split("[")[1].replace("]", ""))
                    return id
                }

                async function parseAndReturnDragonName($dragonName) {
                    const name = $dragonName.textContent
                    return name
                }

                async function parseAndReturnDragonDescription($dragonDescription) {
                    const description = $dragonDescription.textContent.trim()
                    return description
                }

                async function parseAndReturnDragonRarity($dragonRarity) {
                    const rarity = $dragonRarity.textContent.substr(0, 1)
                    return rarity
                }

                async function parseAndReturnDragonElements($elements) {
                    const elements = []

                    for (const $element of $elements) {
                        const element = await parseAndReturnDragonElement($element)
                        elements.push(element)
                    }

                    return elements

                    async function parseAndReturnDragonElement($element) {
                        const element = $element.textContent.toLowerCase()
                        return element
                    }
                }

                function parseStringTimeToMilliseconds(stringTime) {
                    const milissecondsPerSecond = 1000
                    const secondsPerMinute = 60
                    const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                    const minutesPerHour = 60
                    const milisecondsPerHour = milisecondsPerMinute * minutesPerHour

                    const [ hours, minutes, seconds ] = stringTime.split(":").map(Number)
                    const totalMilliseconds = (hours * milisecondsPerHour) + (minutes * milisecondsPerMinute) + (seconds * milissecondsPerSecond)
                    
                    return totalMilliseconds
                }

                async function parseAndReturnDragonBreedingTime($dragonBreedingTime) {
                    const breedingTime = parseStringTimeToMilliseconds($dragonBreedingTime.textContent)
                    return breedingTime
                }

                async function parseAndReturnDragonHatchingTime($dragonHatchingTime) {
                    const hatchingTime = parseStringTimeToMilliseconds($dragonHatchingTime.textContent)
                    return hatchingTime
                }

                async function parseAndReturnDragonGoldProductionIncome($dragonGoldProductionIncome) {
                    if (!$dragonGoldProductionIncome) return null

                    const goldProductionIncome = Number($dragonGoldProductionIncome.textContent.split(" ")[0])
                    return goldProductionIncome
                }

                async function parseAndReturnDragonXpOnHatching($dragonXpOnHatching) {
                    if (!$dragonXpOnHatching) return null

                    const xpOnHatching = Number($dragonXpOnHatching.textContent.replace(/,/g, ""))
                    return xpOnHatching
                }

                async function parseAndReturnDragonImageName($firstImage) {
                    if (!$firstImage) return null

                    const imageName = $firstImage.attributes.src
                        .replace("https://dci-static-s1.socialpointgames.com/static/dragoncity/mobile/ui/dragons/ui_", "")
                        .replace("_3.png", "")
                    return imageName
                }

                async function parseAndReturnDragonPageUrl($dragonName) {
                    const pageUrl = `${dbgamesBaseUrl}/${$dragonName.attributes.href}`
                    return pageUrl
                }
            }
        }
    }

    async function saveInformation() {
        console.log("> [dbgames-robot] Saving data")

        const dbgamesInformationString = JSON.stringify(dbgamesInformation)
        const dbgamesInformationFilePath = "data/dbgames.json"

        fs.writeFileSync(dbgamesInformationFilePath, dbgamesInformationString)
    }
})