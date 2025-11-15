import { router } from "express"
import { supabase } from "../utils/supabase"

const eventsRouter = router()

eventsRouter.get("/", async (req, res) => {

    const user = req.query.user_id;

    const { data, error } = await supabase
        .from("event_participants")
        .select(`
            events (*)
        `)
        .eq("user_id", user
    )


    if (error) {
        return res.status(500).json({ error: error.message })
    }
    res.json(data)
})

export default eventsRouter