import queryString from "node:querystring"
import CryptoJS from "crypto-js"
import axios from "axios"
import fs from "fs"

import state from "./state.js"

export default (async () => {
    console.log("> [ditlep-robot] Starting...")

    const content = state.load()

    const ditlepInformation = {}
    const ditlepBaseUrl = "https://ditlep.com"

    await requestIslandsInformation()
    await requestQuestsInformation()
    await requestAllianceChestsInformation()
    await requestDragonTVInformation()
    await requestDragonsInformation()
    //await requestItemsInformation()
    await saveInformation()

    state.save(content)

    async function requestPageInformation(
        url,
        options = null
    ) {
        if (!options) options  = {}

        if (options.params) {
            console.log(`> [ditlep-robot] Fetching data from the url: ${url}/?${queryString.stringify(options.params)}`)
        } else {
            console.log(`> [ditlep-robot] Fetching data from the url: ${url}`)
        }

        if (!options.headers) {
            options.headers = { "Accept-Encoding": "gzip,deflate,compress" }
        }

        const response = await axios.get(url, options) 

        return await response.data
    }

    async function getDecryptedInformation(pageUrl, options = null) {
        const encryptedInformation = await requestPageInformation(pageUrl, options)
        const decryptedInformation = await decryptInformation(encryptedInformation)

        return decryptedInformation

        async function decryptInformation(encryptedInformation) {
            try {
                const iv = CryptoJS.enc.Hex.parse("e84ad660c4721ae0e84ad660c4721ae0")
                const password = CryptoJS.enc.Utf8.parse("ZGl0bGVwLWRyYWdvbi1jaXR5")
                const salt = CryptoJS.enc.Utf8.parse("ZGl0bGVwLWRyYWdvbi1jaXR5LXNhbHQ=")
                const key = CryptoJS.PBKDF2(password.toString(CryptoJS.enc.Utf8), salt, {
                    keySize: 4,
                    iterations: 1e3
                })
                const cipher = CryptoJS.lib.CipherParams.create({
                    ciphertext: CryptoJS.enc.Base64.parse(encryptedInformation)
                })
                const decryptedInformation = CryptoJS.AES.decrypt(cipher, key, {
                    mode: CryptoJS.mode.CBC,
                    iv: iv,
                    padding: CryptoJS.pad.Pkcs7
                })
        
                return JSON.parse(decryptedInformation.toString(CryptoJS.enc.Utf8))

            } catch (error) {
                console.error(error)

                throw new Error("> [ditlep-robot-error] Failed when trying to decrypt data")
            }
        }
    }

    async function getDragonsById(dragonsId) {
        const url = `${ditlepBaseUrl}/Dragon/GetDragonByIds`
        const options = { params: { dragonIds: dragonsId } }
        const dragons = await getDecryptedInformation(url, options)

        return dragons
    }

    async function requestIslandsInformation() {
        console.log("> [ditlep-robot] Requesting data from islands")

        ditlepInformation.islands = {}

        await requestHeroicRaceInformation()
        await requestMazeIslandInformation()
        await requestGridIslandInformation()
        await requestFogIslandInformation()
        await requestTowerIslandInformation()
        await requestPuzzleIslandInformation()
        await requestRunnerIslandInformation()
        
        async function requestHeroicRaceInformation() {
            console.log("> [ditlep-robot] Requesting data from Heroic Race")

            const information = await requestAndReturnMainInformation() 
            information.lapRewards = await requestAndReturnLapRewardsInformation()

            ditlepInformation.islands.heroicRace = information

            async function requestAndReturnMainInformation() {
                const url = `${ditlepBaseUrl}/HeroicRace/Get`
                const mainInformation = await getDecryptedInformation(url)

                return mainInformation
            }

            async function requestAndReturnLapRewardsInformation() {
                const url = `${ditlepBaseUrl}/HeroicRace/GetLapRewards`
                const lapRewardsInformation = await getDecryptedInformation(url)

                return lapRewardsInformation
            }
        }

        async function requestMazeIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Maze Island`)

            const url = `${ditlepBaseUrl}/MazeIsland/Get/`
            const information = await getDecryptedInformation(url)

            const islandDragonsId = []

            for (const path of information.config.paths) {
                islandDragonsId.push(path.dragon_type)
            }

            information.dragons = await getDragonsById(islandDragonsId)

            ditlepInformation.islands.mazeIsland = information
        }

        async function requestGridIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Grid Island`)

            const url = `${ditlepBaseUrl}/GridIsland/Get`
            const information = await getDecryptedInformation(url)

            ditlepInformation.islands.gridIsland = information
        }

        async function requestFogIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Fog Island`)

            const url = `${ditlepBaseUrl}/FogIsland/Get`
            const options = { params: { "latest": true,"routeId": 0 } }
            const information = await getDecryptedInformation(url, options)

            ditlepInformation.islands.fogIsland = information
        }

        async function requestTowerIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Tower Island`)

            const url = `${ditlepBaseUrl}/TowerIsland/Get`
            const information = await getDecryptedInformation(url)

            ditlepInformation.islands.towerIsland = information
        }

        async function requestPuzzleIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Puzzle Island`)

            const url = `${ditlepBaseUrl}/PuzzleIsland/Get`
            const information = await getDecryptedInformation(url)

            ditlepInformation.islands.puzzleIsland = information
        }

        async function requestRunnerIslandInformation() {
            console.log(`> [ditlep-robot] Requesting data from Runner Island`)

            const url = `${ditlepBaseUrl}/PuzzleIsland/Get`
            const information = await getDecryptedInformation(url)

            ditlepInformation.islands.runnerIsland = information
        }
    }

    async function requestQuestsInformation() {
        console.log(`> [ditlep-robot] Requesting data from Quests`)

        const url = `${ditlepBaseUrl}/Tournament/GetAll`
        const questsInformation = await getDecryptedInformation(url)

        ditlepInformation.quests = questsInformation
    }

    async function requestAllianceChestsInformation(month = null) {
        console.log(`> [ditlep-robot] Requesting data from Alliance chests`)

        if (!month) month = new Date().getMonth() + 1

        const url = `${ditlepBaseUrl}/AllianceChest/Get?month=${month}`
        const allianceChestsInformation = await getDecryptedInformation(url)

        ditlepInformation.allianceChests = allianceChestsInformation
    }

    async function requestDragonTVInformation(month = null) {
        console.log(`> [ditlep-robot] Requesting data from Dragon TV`)

        if (!month) month = new Date().getMonth() + 1

        const url = `${ditlepBaseUrl}/DragonTv/Get`
        const options = { params: { month } }
        const dragonTVInformation = await getDecryptedInformation(url, options)

        ditlepInformation.dragonTV = dragonTVInformation
    }

    async function requestDragonsInformation() {
        console.log(`> [ditlep-robot] Requesting data from All dragons`)

        const dragonPageUrl = `${ditlepBaseUrl}/Dragon/Search`
        const dragonsPerPage = 20
        const options = {
            params: {
                dragonName: "",
                rarities: [],
                elements: "",
                page: 0,
                pageSize: dragonsPerPage,
                category: "",
                inStore: null,
                breedable: null,
                tag: ""
            }
        }

        ditlepInformation.dragons = await requestAndReturnDragonPagesInformation()

        async function requestAndReturnDragonPagesInformation() {
            const totalOfPages = await getTotalPages(dragonsPerPage)

            const dragonsInformation = []

            for (let pageNumber = 0; pageNumber <= totalOfPages; pageNumber++) {
                const pageDragonsInformation = await requestAndReturnDragonPageInformation(pageNumber)

                dragonsInformation.push(...pageDragonsInformation.items)
            }

            async function getTotalPages(dragonsPerPage) {
                const firstPageInformation = await requestAndReturnDragonPageInformation(0)
                const totalOfDragons = firstPageInformation.total
                const totalOfPages = Math.ceil(totalOfDragons / dragonsPerPage)

                return totalOfPages
            }

            async function requestAndReturnDragonPageInformation(pageNumber) {
                options.params.page = pageNumber

                const pageDragonsInformation = await getDecryptedInformation(dragonPageUrl, options)

                return pageDragonsInformation
            }

            return dragonsInformation
        }
    }

    async function requestItemsInformation() {
        const itemsPageUrl = `${ditlepBaseUrl}/Items/ItemFilter?`
        const itemsPerPage = 20
        const itemsRequestParams = {
            "sort": "",
            "group": "",
            "page": 1,
            "pageSize": 20,
            "filter": "TypeId~eq~''~or~Name~contains~''~or~BuildingTime~contains~''~or~Price~contains~''~or~Sell~contains~''~or~InStore~contains~''"
        }

        ditlepInformation.items = await requestAndReturnItemPagesInformation()

        async function requestAndReturnItemPagesInformation() {
            const totalOfPages = await getTotalPages(itemsPerPage)

            const itemsInformation = []

            for (let pageNumber = 1; pageNumber <= totalOfPages; pageNumber++) {
                const pageItemsInformation = await requestAndReturnItemPage(pageNumber)

                itemsInformation.push(...pageItemsInformation.Data)
            }

            return itemsInformation

            async function getTotalPages(itemsPerPage) {
                const firstPageInformation = await requestAndReturnItemPage(1)
                const totalOfItems = firstPageInformation.Total
                const totalOfPages = Math.ceil(totalOfItems / itemsPerPage)

                return totalOfPages
            }

            async function requestAndReturnItemPage(pageNumber) {}
        }
    }

    async function saveInformation() {
        console.log("> [ditlep-robot] Saving data")

        const ditlepInformationString = JSON.stringify(ditlepInformation)
        const ditlepInformationFilePath = "data/ditlep.json"

        fs.writeFileSync(ditlepInformationFilePath, ditlepInformationString)
    }
})