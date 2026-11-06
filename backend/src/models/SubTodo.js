/*
 * This file is the blueprint for a tiny step inside a bigger task.
 * Example: task "Clean room" could have a sub-todo "Make the bed".
 */
const mongoose = require("mongoose")
const subTodoSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, default: ""},
    completed: {type: Boolean, default: false}
})

module.exports = mongoose.model("SubTodo", subTodoSchema)