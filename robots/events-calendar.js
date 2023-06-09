import htmlParser from "node-html-parser"
import axios from "axios"
import fs from "fs"

export default (async () => {
    console.log("> [events-calendar-robot] Starting...")

    const eventsCalendarInformation = {}
    const socialPointHelpShiftBaseUrl = "https://socialpoint.helpshift.com"

    await getLastEventsCalendarPageUrl()
    await requestEventsCalendarInformation()
    await saveInformation()

    async function getPageDOMDocument(pageUrl, options = null) {
        if (!options) options  = {}

        if (options.params) {
            console.log(`> [events-calendar-robot] Fetching html page from the url: ${pageUrl}/?${queryString.stringify(options.params)}`)
        } else {
            console.log(`> [events-calendar-robot] Fetching html page from the url: ${pageUrl}/`)
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
    
    async function getLastEventsCalendarPageUrl() {
        const eventsCalendarHomePageUrl = `${socialPointHelpShiftBaseUrl}/hc/pt/7-dragon-city/section/300-events-1668599260`

        const document = await getPageDOMDocument(eventsCalendarHomePageUrl)
        const $items = document.querySelectorAll(".section-nav-item")

        const pageUrl = await getLastEventsCalendarPageUrl($items)

        eventsCalendarInformation.pageUrl = pageUrl
        
        async function getLastEventsCalendarPageUrl($items) {
            for (const $item of $items) { 
                const verificationResult = verifyItemHasEventsCalendarLink($item)

                if (verificationResult) return verificationResult
            }
              
            async function verifyItemHasEventsCalendarLink($item) {
                const $title = $item.querySelector(".section-faq-title")
                const titleTextLower = $title.textContent.toLowerCase()

                if (titleTextLower.startsWith("próximos eventos:") || titleTextLower.startsWith("o que vem por aí:")) {
                    const $pageLink = $item.querySelector(".link.section-faq.js-faq-link")

                    const pageUrl = parseAndReturnPageUrl($pageLink)

                    return pageUrl
                }

                return null

                async function parseAndReturnPageUrl($pageLink) {
                    const pageUrl = `${socialPointHelpShiftBaseUrl}${$pageLink.attributes.href}`
                    return pageUrl
                }
            }
        }
    }

    async function requestEventsCalendarInformation() {
        console.log("> [events-calendar-robot] Requesting page and parsing data from event list")

        const url = eventsCalendarInformation.pageUrl
        const document = await getPageDOMDocument(url)

        const $title = document.querySelector(".faq-title")
        const $content = document.querySelector(".js-faq-details-article-body")

        const content = await parseAndReturnContent($content)
        const title = await parseAndReturnTitle($title)

        eventsCalendarInformation.title = title
        eventsCalendarInformation.content = content
        
        async function parseAndReturnContent($content) {
            const contentWithoutTagsAndEmojis = await removeTagsAndEmojis($content.innerHTML)
            const separatedContent = await separateIntroductionAndEventListFromContent(contentWithoutTagsAndEmojis)
            const introduction = separatedContent.introduction
            const eventList = await parseAndReturnEventList(separatedContent.eventList)

            const content = {}

            content.introduction = introduction
            content.eventList = eventList

            return content
                
            async function removeTagsAndEmojis(contentInnerHtml) {
                const contentWithoutTagsAndEmojis = contentInnerHtml
                    .replace(/<br>/gi, "\n")
                    .replace(/<strong>/gi, "\n")
                    .replace(/<(.*?)>/gi, "")
                    .replace(/<(.*?)\/>/gi, "")
                    .replace(/&(.*?);/gi, "")
                    .trim()

                return contentWithoutTagsAndEmojis
            }

            async function separateIntroductionAndEventListFromContent(contentWithoutTagsAndEmojis) {
                const separatedContent = {}

                let [ introduction, eventList ] = contentWithoutTagsAndEmojis.split("\n\n")

                console.log(introduction, eventList)

                eventList = eventList.split("\n")

                separatedContent.introduction = introduction
                separatedContent.eventList = eventList

                return separatedContent
            }

            async function parseAndReturnEventList(rawEventList) {
                const eventList = []

                for (let eventIndex = 1; eventIndex < rawEventList.length; eventIndex += 2) {
                    const rawTimesAndName = rawEventList[eventIndex - 1]
                    const rawNewDragon = rawEventList[eventIndex].split(":")[1]

                    const timesAndNameAndType = await parseAndReturnEventTimesAndNameAndType(rawTimesAndName)
                    const newDragon = await parseAndReturnNewDragon(rawNewDragon)

                    eventList.push({
                        name: timesAndNameAndType.name,
                        times: timesAndNameAndType.times,
                        type: timesAndNameAndType.type,
                        newDragon: newDragon
                    })
                }

                return eventList

                async function parseAndReturnEventTimesAndNameAndType(rawTimesAndName) {
                    const [ rawEventTimes, rawEventName ] = rawTimesAndName.trim().split(":")

                    const currentYear = new Date().getFullYear()

                    const eventName = await parseAndReturnEventName(rawEventName)
                    const eventType = await parseAndReturnEventType(eventName)
                    const [ startDateWithoutYear, endDateWithoutYear ] = rawEventTimes.match(/\b(\d+\/\d+)\b/g)
                    const [ eventstartTimestamp, eventEndTimestamp ] = await parseAndReturnEventStartAndEndTimestamp(startDateWithoutYear, endDateWithoutYear)
                    const eventDurationInMilliseconds = Math.floor(eventEndTimestamp - eventstartTimestamp)
                    
                    const timesAndName = {
                        name: eventName,
                        type: eventType,
                        times: {
                            start: eventstartTimestamp,
                            end: eventEndTimestamp,
                            duration: eventDurationInMilliseconds
                        }
                    }

                    return timesAndName

                    async function parseAndReturnEventName(rawEventName) {
                        const eventName = rawEventName.trim()
                        return eventName
                    }
                    
                    async function parseAndReturnEventType(eventName) {
                        const eventTypes = {
                            DIVINE_PASS: [ "divino" ],
                            MAZE_ISLANDS: [ "labirinto" ],
                            GRID_ISLANDS: [ "grade" ],
                            FOG_ISLANDS: [ "neblina" ], 
                            HEROIC_RACES: [ "corrida heroica" ],
                            PUZZLE_ISLANDS: [ "quebra-cabeça" ],
                            RUNNER_ISLANDS: [ "corredor" ],
                            TOWER_ISLADS: [ "torre" ]
                        }

                        let eventType

                        eventKeysLoop: for (const eventTypeKey of Object.keys(eventTypes)) {
                            const possibleNames = eventTypes[eventTypeKey]

                            for (const possibleName of possibleNames) {
                                if (eventName
                                    .toLowerCase()
                                    .includes(possibleName)
                                ) {
                                    eventType = eventTypeKey
                                    break eventKeysLoop
                                }
                            }
                        }

                        if (eventType) return eventType

                        throw new Error(`> [events-calendar-error] possible names: ${eventName}`)
                    }

                    async function parseAndReturnEventStartAndEndTimestamp(startDateWithoutYear, endDateWithoutYear) {
                        let startTimestamp = await getTimestampFromDayMonthYearDate(`${startDateWithoutYear}/${currentYear}`)
                        let endTimestamp = await getTimestampFromDayMonthYearDate(`${endDateWithoutYear}/${currentYear}`)

                        if (startTimestamp > endTimestamp) {
                            endTimestamp = await getTimestampFromDayMonthYearDate(`${endDateWithoutYear}/${currentYear + 1}`)
                        }

                        async function getTimestampFromDayMonthYearDate(date, separator="/") {
                            const [ day, month, year ] = date.split(separator)
                            const timestamp = parseInt(new Date(`${month}/${day}/${year}`).getTime())
                            return timestamp
                        }

                        return [ startTimestamp, endTimestamp ]
                    } 
                }

                async function parseAndReturnNewDragon(rawNewDragon) {
                    const newDragon = rawNewDragon.trim()
                    return newDragon
                }
            }
        }

        async function parseAndReturnTitle($title) {
            const title = $title.textContent.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase())
            return title
        }
    }

    async function saveInformation() {
        console.log("> [events-calendar] Saving data")

        const eventsCalendarInformationString = JSON.stringify(eventsCalendarInformation)
        const eventsCalendarInformationFilePath = "data/events-calendar.json"

        fs.writeFileSync(eventsCalendarInformationFilePath, eventsCalendarInformationString)
    }
})