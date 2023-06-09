import htmlParser from "node-html-parser"
import axios from "axios"
import fs from "fs"

import state from "./state.js"

const dragonElementsNames = {"w":"water","p":"plant","f":"fire","d":"dark","e":"earth","el":"electric","m":"metal","i":"ice","wr":"war","l":"legend","li":"light","pu":"pure","bt":"beauty","ch":"chaos","mg":"magic","hp":"happiness","dr":"dream","so":"soul","pr":"primal","wd":"wind","ti":"time"}

export default (async () => {
    console.log("> [deetlist-robot] Starting...")

    const content = state.load()

    const deetlistInformation = {}
    const deetlistBaseUrl = "https://deetlist.com/dragoncity"

    await requestAndParseIslandsInformation()
    await requestAndParseDragonsInformation()
    await saveInformation()

    async function getPageDOMDocument(pageUrl) {
        console.log(`> [deetlist-robot] Fetching html page from the url: ${pageUrl}`)

        const response = await requestAndReturnPageInformation(pageUrl)
        const DOMDocument = await convertAndReturnPageTextToDOM(response)

        return DOMDocument

        async function requestAndReturnPageInformation(pageUrl) {
            const response = await axios.get(pageUrl)
            return response.data
        }

        async function convertAndReturnPageTextToDOM(pageText) {
            const DOMDocument = htmlParser.parse(pageText)
            return DOMDocument
        }
    }

    async function requestAndParseIslandsInformation() {
        console.log("> [deetlsit-robot] Requesting page and parsing data from islands")

        deetlistInformation.islands = {}

        await requestAndParseHeroicRaceInformation()
        await requestAndParseMazeIslandInformation()
        await requestAndParseGridIslandInformation()
        await requestAndParseFogIslandInformation()
        await requestAndParseTowerIslandInformation()
        await requestAndParsePuzzleIslandInformation()
        await requestAndParseRunnerIslandInformation()

        async function requestAndParseHeroicRaceInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Heroic Race")

            const url = `${deetlistBaseUrl}/events/race/`
            const document = await getPageDOMDocument(url)

            const $islandDurationTitle = document.querySelector(".dur_text")
            const $islandName = document.querySelector("h1")
            const $dragons = document.querySelectorAll(".over")
            const $laps = document.querySelectorAll(".hl")
            
            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($islandName)
            information.dragons = await parseAndReturnDragons($dragons)
            information.laps = await parseAndReturnLaps($laps)
            
            deetlistInformation.islands.heroicRace = information
            
            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl).replace(" ", "%20")
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }

            async function parseAndReturnLaps($laps) {
                const laps = []

                for (const $lap of $laps) {
                    const lap = await parseAndReturnLap($lap)
                    laps.push(lap)
                }

                return laps

                async function parseAndReturnLap($lap) {
                    const $firstNodeHeader = $lap.querySelector(".nnh")
                    const $nodes = $lap.querySelectorAll(".nn")

                    const lapNumber = await getLapNumber($firstNodeHeader)
                    const lapNodes = await parseAndReturnNodes($nodes)

                    return {
                        number: lapNumber,
                        nodes: lapNodes
                    }

                    async function getLapNumber($firstNodeHeader) {
                        const textOfBFirstNodeHeader = $firstNodeHeader.textContent
                        const lapNumber = Number(textOfBFirstNodeHeader.split("-")[0].replace("Lap", ""))
                        return lapNumber
                    }

                    async function parseAndReturnNodes($nodes) {
                        const nodes = []

                        for (const $node of $nodes) {
                            const node = await parseAndReturnNode($node)
                            nodes.push(node)
                        }

                        return nodes

                        async function parseAndReturnNode($node) {
                            const $nodeHeader = $node.querySelector(".nnh")
                            const $nodeMissions = $node.querySelectorAll(".mm")

                            const nodeNumber = await getNodeNumber($nodeHeader)
                            const nodeMissions = await parseAndReturnMissions($nodeMissions)
                            
                            return {
                                number: nodeNumber,
                                missions: nodeMissions
                            }

                            async function getNodeNumber($nodeHeader) {
                                const textOfNodeHeader = $nodeHeader.textContent
                                const nodeNumber = Number(textOfNodeHeader.split("-")[1].replace("Node", ""))
                                return nodeNumber
                            }

                            async function parseAndReturnMissions($missions) {
                                const missions = []

                                for (const $mission of $missions) {
                                    const mission = await parseAndReturnMission($mission)
                                    missions.push(mission)
                                }

                                return missions

                                async function parseAndReturnMission($mission) {
                                    const $missionInformations = $mission.querySelectorAll(".m2")

                                    const $missionGoalPoints = $missionInformations[0]
                                    const $missionPoolSize = $missionInformations[1]
                                    const $missionPoolTime = $missionInformations[2]
                                    const $missionTotalPoolTime = $missionInformations[4]
                                    const $missionItemCollectChance = $missionInformations[3]

                                    const missionGoalPoints = await parseAndReturnGoalPoints($missionGoalPoints)
                                    const missionPoolSize = await parseAndReturnPoolSize($missionPoolSize)
                                    const missionPoolTime = await parseAndReturnPoolTime($missionPoolTime)
                                    const missionTotalPoolTime = await parseAndReturnPoolTime($missionTotalPoolTime)
                                    const missionItemCollectChance = await parseAndReturnItemCollectChance($missionItemCollectChance)

                                    return {
                                        goalPoints: missionGoalPoints,
                                        pool: {
                                            size: missionPoolSize,
                                            time: {
                                                one: missionPoolTime,
                                                all: missionTotalPoolTime
                                            }
                                        },
                                        itemCollectChance: missionItemCollectChance
                                    }
                                    
                                    async function parseAndReturnGoalPoints($missionGoalPoints) {
                                        const missionGoalPoints = Number($missionGoalPoints.textContent)
                                        return missionGoalPoints
                                    }

                                    async function parseAndReturnPoolSize($missionPoolSize) {
                                        const missionPoolSize = Number($missionPoolSize.textContent)
                                        return missionPoolSize
                                    }

                                    async function parseAndReturnPoolTime($missionPoolTime) {
                                        const rawPoolTime = $missionPoolTime.textContent

                                        if (rawPoolTime === "Instant" || rawPoolTime === "No Minimum") return 0

                                        return 1
                                    }

                                    async function parseAndReturnItemCollectChance($missionItemCollectChance) {
                                        const itemCollectChance = Number($missionItemCollectChance.textContent.replace("%", "")) / 100
                                        return itemCollectChance
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        async function requestAndParseMazeIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from MazeIsland")

            const url = `${deetlistBaseUrl}/events/maze/`
            const document = await getPageDOMDocument(url)

            const $islandDurationTitle = document.querySelector(".dur_text")
            const $islandName = document.querySelector("h1")
            const $paths = document.querySelectorAll(".ee")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($islandName)
            information.paths = await parseAndReturnPaths($paths)

            deetlistInformation.islands.mazeIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase()).replace("Guide", "").trim()
                return name
            }

            async function parseAndReturnPaths($paths) {
                const paths = []

                for (const $path of $paths) {
                    const path = await parseAndReturnPath($path)
                    paths.push(path)
                }

                return paths

                async function parseAndReturnPath($path) {
                    const $pathDragon = $path.querySelector(".ev_ds")
                    const $dragonName = $path.querySelector("h3")
                    const $pathNodes = $path.querySelectorAll(".miihold")
                    const $pathNodesCost = [ null, ...$path.querySelectorAll(".mii_step") ]

                    const pathDragon = await parseAndReturnDragon($pathDragon, $dragonName)
                    const pathTotalCost = await parseAndRetrunTotalCost($pathDragon)
                    const pathNodes = await parseAndReturnNodes($pathNodes, $pathNodesCost)

                    return {
                        dragon: pathDragon,
                        totalCost: pathTotalCost,
                        nodes: pathNodes
                    }

                    async function parseAndReturnDragon($dragon, $dragonName) {
                        const $dragonCategory = $dragon.querySelector("p")
                        const $dragonRarity = $dragon.querySelector(".img_rar")
                        const $dragonElements = $dragon.querySelectorAll(".typ_i")
                        const $dragonImage = $dragon.querySelector(".mi_i_hld")
                        const $dragonPageLink = $dragon.querySelector("a")

                        const dragonName = await parseAndReturnDragonName($dragonName)
                        const dragonCategory = await parseAndReturnDragonCategory($dragonCategory)
                        const dragonRarity = await parseAndReturnDragonRarity($dragonRarity)
                        const dragonElements = await parseAndReturnDragonElements($dragonElements)
                        const dragonImageUrl = await parseAndReturnDragonImageUrl($dragonImage)
                        const dragonPageUrl = await parseAndReturnDragonPageUrl($dragonPageLink)

                        return {
                            name: dragonName,
                            category: dragonCategory,
                            rarity: dragonRarity,
                            elements: dragonElements,
                            imageUrl: dragonImageUrl,
                            pageUrl: dragonPageUrl
                        }

                        async function parseAndReturnDragonName($name) {
                            const dragonName = $name.textContent.trim()
                            return dragonName
                        }

                        async function parseAndReturnDragonCategory($category) {
                            const dragonCategory = Number($category.textContent.split(":")[1])
                            return dragonCategory
                        }

                        async function parseAndReturnDragonRarity($rarity) {
                            const dragonRarityClass = $rarity.classList.value
                            const dragonRarity = dragonRarityClass[0].replace("img_rp_", "").toUpperCase()
                            return dragonRarity
                        } 

                        async function parseAndReturnDragonElements($elements) {
                            const elements = []

                            for (const $element of $elements) {
                                const element = await parseAndReturnDragonElement($element)
                                elements.push(element)
                            }

                            return elements

                            async function parseAndReturnDragonElement($element) {
                                const elementClass = $element.classList.value[1]
                                const elementKeyName = elementClass.replace("tb_", "")
                                const elementName = dragonElementsNames[elementKeyName]
    
                                return elementName
                            }
                        }

                        async function parseAndReturnDragonImageUrl($image) {
                            const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                            return imageUrl
                        }

                        async function parseAndReturnDragonPageUrl($pageLink) {
                            const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                            return pageUrl
                        }
                    }

                    async function parseAndRetrunTotalCost($dragon) {
                        const totalCost = Number($dragon.textContent.split(":")[2].split(" ")[1])
                        return totalCost
                    }

                    async function parseAndReturnNodes($nodes, $costs) {
                        const nodes = []

                        for (let nodeIndex = 0; nodeIndex < $nodes.length; nodeIndex++) {
                            const node = await parseAndReturnNode($nodes[nodeIndex], $costs[nodeIndex])
                            nodes.push(node)
                        }

                        return nodes

                        async function parseAndReturnNode($node, $nodeCost) {
                            const $nodeNumber = $node.querySelector(".nummi")
                            const $nodeTitle = $node.querySelector(".mi_con")
                            const $nodeAccumuledCost = $node.querySelector(".mii_tota b")

                            const nodeNumber = await parseAndReturnNodeNumber($nodeNumber)
                            const nodeTitle = await parseAndReturnNodeTitle($nodeTitle)
                            const nodeCost = await parseAndReturnNodeCost($nodeCost)
                            const nodeAccumuledCost = await parseAndReturnNodeAccumuledCost($nodeAccumuledCost)

                            return {
                                number: nodeNumber,
                                title: nodeTitle,
                                const: {
                                    current: nodeCost,
                                    accumuled: nodeAccumuledCost
                                }
                            }

                            async function parseAndReturnNodeNumber($nodeNumber) {
                                const nodeNumber = Number($nodeNumber.textContent)
                                return nodeNumber
                            }

                            async function parseAndReturnNodeTitle($nodeTitle) {
                                const nodeTitle = $nodeTitle.textContent
                                return nodeTitle
                            }

                            async function parseAndReturnNodeCost($nodeCost) {
                                if ($nodeCost) {
                                    const nodeCost = Number($nodeCost.textContent.trim().substr(1))
                                    return nodeCost  
                                }
                                
                                return 0
                            }
 
                            async function parseAndReturnNodeAccumuledCost($nodeAccumuledCost) {
                               const nodeAccumuledCost = Number($nodeAccumuledCost.textContent)
                               return nodeAccumuledCost
                            }
                        }
                    }
                }
            }
        }

        async function requestAndParseGridIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Grid Island")

            const url = `${deetlistBaseUrl}/events/grid/`
            const document = await getPageDOMDocument(url)

            const $isalndName = document.querySelector("h1")
            const $islandDurationTitle = document.querySelector(".dur_text")
            const $dragons = document.querySelectorAll(".over")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($isalndName)
            information.dragons = await parseAndReturnDragons($dragons)

            deetlistInformation.islands.gridIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }
        }

        async function requestAndParseFogIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Fog Island")

            const url = `${deetlistBaseUrl}/events/fog/`
            const document = await getPageDOMDocument(url)

            const $isalndName = document.querySelector("h1")
            const $islandDurationTitle = document.querySelector(".dur_text")
            const $dragons = document.querySelectorAll(".over")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($isalndName)
            information.dragons = await parseAndReturnDragons($dragons)

            deetlistInformation.islands.fogIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }
        }

        async function requestAndParseTowerIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Tower Island")

            const url = `${deetlistBaseUrl}/events/tower/`
            const document = await getPageDOMDocument(url)

            const $isalndName = document.querySelector("h1")
            const $islandDurationTitle = document.querySelector(".dur_text")
            const $dragons = document.querySelectorAll(".over")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($isalndName)
            information.dragons = await parseAndReturnDragons($dragons)

            deetlistInformation.islands.towerIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }
        }

        async function requestAndParsePuzzleIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Puzzle Island")

            const url = `${deetlistBaseUrl}/events/puzzle/`
            const document = await getPageDOMDocument(url)

            const $isalndName = document.querySelector("h1")
            const $islandDurationTitle = document.querySelector(".dur_text")
            const $dragons = document.querySelectorAll(".over")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($isalndName)
            information.dragons = await parseAndReturnDragons($dragons)

            deetlistInformation.islands.puzzleIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }

            async function parseAndReturnMissions($missions) {
                async function parseAndReturnMission($mission) {}
            }
        }

        async function requestAndParseRunnerIslandInformation() {
            console.log("> [deetlist-robot] Requesting page and parsing data from Runner Island")

            const url = `${deetlistBaseUrl}/events/puzzle/`
            const document = await getPageDOMDocument(url)

            const $isalndName = document.querySelector("h1")
            const $islandDurationTitle = document.querySelector(".dur_text")
            const $dragons = document.querySelectorAll(".over")

            const information = {}

            information.duration = await parseAndReturnDuration($islandDurationTitle)
            information.name = await parseAndReturnName($isalndName)
            information.dragons = await parseAndReturnDragons($dragons)

            deetlistInformation.islands.runnerIsland = information

            async function parseAndReturnDuration($duration) {
                const milissecondsPerSecond = 1000
                const secondsPerMinute = 60
                const milisecondsPerMinute = milissecondsPerSecond * secondsPerMinute
                const minutesPerHour = 60
                const milisecondsPerHour = milisecondsPerMinute * minutesPerHour
                const hoursPerDay = 24
                const milissecondsPerDay = milisecondsPerHour * hoursPerDay

                const islandDuration = Number($duration.textContent.split(" ")[3]) * milissecondsPerDay

                return islandDuration
            }

            async function parseAndReturnName($name) {
                const name = $name.textContent.trim().toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
                return name
            }

            async function parseAndReturnDragons($dragons) {
                const dragons = []

                for (const $dragon of $dragons) {
                    const dragon = await parseAndReturnDragon($dragon)
                    dragons.push(dragon)
                } 

                return dragons

                async function parseAndReturnDragon($dragon) {
                    const $name = $dragon.querySelector(".pan_ic")
                    const $rarity = $dragon.querySelector(".img_rar")
                    const $elements = $dragon.querySelectorAll(".typ_i")
                    const $pageLink = $dragon.querySelector("a")
                    const $image = $dragon.querySelector(".pan_img")

                    const dragon = {}

                    dragon.name = await parseAndReturnDragonName($name)
                    dragon.rarity = await parseAndReturnDragonRarity($rarity)
                    dragon.elements = await parseAndReturnDragonElements($elements)
                    dragon.pageUrl = await parseAndReturnDragonPageUrl($pageLink)
                    dragon.imageUrl = await parseAndReturnDragonImageUrl($image)

                    return dragon

                    async function parseAndReturnDragonName($name) {
                        const name = $name.textContent.trim()
                        return name
                    }

                    async function parseAndReturnDragonRarity($rarity) {
                        const rarityClass = $rarity.classList.value[0]
                        const rarity = rarityClass.replace("img_rp_", "").trim().toUpperCase()
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
                            const elementClass = $element.classList.value[1]
                            const elementKeyName = elementClass.replace("tb_", "")
                            const elementName = dragonElementsNames[elementKeyName]

                            return elementName
                        }
                    }

                    async function parseAndReturnDragonPageUrl($pageLink) {
                        const pageUrl = $pageLink.attributes.href.replace("../../", deetlistBaseUrl)
                        return pageUrl
                    }

                    async function parseAndReturnDragonImageUrl($image) {
                        const imageUrl = $image.attributes.src.replace("../../", deetlistBaseUrl)
                        return imageUrl
                    }
                }
            }
        }
    }

    async function requestAndParseDragonsInformation() {
        console.log("> [deetlist-robot] Requesting page and parsing data from All Dragons")

        const url = `${deetlistBaseUrl}/all-dragons/`
        const document = await getPageDOMDocument(url)
        
        const $dragonsScript = document.querySelector("#q_src ~ script")
        const $dragons = document.querySelectorAll(".drag_link:has(.drag)")

        const dragonsObject = await parseAndReturnDragonsObject($dragonsScript)
        const dragons = await parseAndReturnDragons($dragons, dragonsObject)

        deetlistInformation.dragons = dragons

        async function parseAndReturnDragonsObject($dragonsScript) {
            const dragonsObjectString = $dragonsScript.textContent.split("=")[1].split(";")[0].trim()
            const dragonsJson = JSON.parse(dragonsObjectString)
            return dragonsJson
        }

        async function parseAndReturnDragons($dragons, dragonsObject) {
            const dragonsObjectKeys = Object.keys(dragonsObject)
            const dragons = []

            for (let dragonIndex = 0; dragonIndex < $dragons.length; dragonIndex++) {
                const dragonObjectKey = dragonsObjectKeys[dragonIndex]
                const dragonObject = dragonsObject[dragonObjectKey]
                const dragon = await parseAndReturnDragon($dragons[dragonIndex], dragonObject, dragonObjectKey)
                dragons.push(dragon)
            }

            return dragons

            async function parseAndReturnDragon($dragon, dragonObject, dragonObjectKey) {
                const $dragonName = $dragon.querySelector(".drag")
                const rawDragonElementsInArray = await getElementsInArray(dragonObject)

                const dragon = {}

                dragon.name = await parseAndReturnDragonName($dragonName, dragonObjectKey)
                dragon.category = await parseAndReturnDragonCategory(dragonObject.c)
                dragon.elements = await parseAndReturnDragonElements(rawDragonElementsInArray)
                dragon.imageUrl = await parseAndReturnDragonImageUrl($dragon)
                dragon.pageUrl = await parseAndReturnDragonPageUrl($dragon)

                return dragon

                async function getElementsInArray(dragonObject) {
                    const dragonElementsLimit = 4
                    const dragonObjectKeys = Object.keys(dragonObject)

                    const elements = []

                    for (let i = 1; i <= dragonElementsLimit; i++) {
                        const key = `t${i}`
                        if (!dragonObjectKeys.includes(key)) break
                        elements.push(dragonObject[key])
                    }

                    return elements
                }

                async function parseAndReturnDragonName($name, nameOfObject) {
                    const nameOfHtml = $name.textContent
                    let namekeyEquivalent = ""

                    for (const word of nameOfHtml.toLowerCase().split(" ")) {
                        if (word !== "dragon") {
                            namekeyEquivalent += word + " "
                        }
                    }

                    namekeyEquivalent = namekeyEquivalent.trim()

                    if (!(namekeyEquivalent === nameOfObject || "dragon " + namekeyEquivalent === nameOfObject)) {
                        console.log(namekeyEquivalent)
                        console.log(nameOfObject)

                        throw new Error("> [deetlist-robot] Dragon name coming from object is different than coming from HTML")
                    }

                    return nameOfHtml
                }

                async function parseAndReturnDragonCategory(categoryOfObject) {
                    const category = Number(categoryOfObject)
                    return category
                }

                async function parseAndReturnDragonElements(elementsOfObject) {
                    const elements = []

                    for (const elementOfObject of elementsOfObject) {
                        const element = await parseAndReturnDragonElement(elementOfObject)
                        elements.push(element)
                    }

                    return elements

                    async function parseAndReturnDragonElement(elementOfObject) {
                        const element = dragonElementsNames[elementOfObject]
                        return element
                    }
                }

                async function parseAndReturnDragonImageUrl($pageLink) {
                    const imageUrl = $pageLink.attributes.href.replace("../", `${deetlistBaseUrl}img/`).toLowerCase().replace(" ", "%20") + ".png"
                    return imageUrl
                }

                async function parseAndReturnDragonPageUrl($pageLink) {
                    const pageUrl = $pageLink.attributes.href
                        .replace("../", deetlistBaseUrl)
                        .replace(" ", "%20")
                        
                    return pageUrl
                }
            }
        } 
    }

    async function saveInformation() {
        console.log("> [deetlsit-robot] Saving data")

        const deetlistInformationString = JSON.stringify(deetlistInformation)
        const deetlistInformationFilePath = "data/deetlist.json"

        fs.writeFileSync(deetlistInformationFilePath, deetlistInformationString)
    }
})