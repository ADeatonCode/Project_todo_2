const mongoose = require("mongoose")
const subTodoSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, default: ""},
    completed: {type: Boolean, default: false}
})

module.exports = mongoose.model("SubTodo", subTodoSchema)