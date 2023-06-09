import robots from "./robots/index.js"
import state from "./robots/state.js"

(async () => {
    console.log("> [orchestrator-of-robots] Starting...")

    const content = {}
    
    state.save(content)

    await robots.localization() // concluído!
    await robots.ditlep() // Ainda não compara os dados
    await robots.deetlist() // Ainda não compara os dados
    await robots.dbgames() // Ainda não compara os dados
    await robots.eventsCalendar() // Ainda não compara os dados

    console.log("> [orchestrator-of-robots] Finished!")
})()