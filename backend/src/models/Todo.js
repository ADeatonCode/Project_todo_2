const mongoose= require("mongoose")
const todoSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: { type: String, default:"" },
    completed: {type: Boolean, default: false},
    tags: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
        required: true
    }],
    subTodos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubTodo'
    }]
}, {
    timestamps: true
})
module.exports =mongoose.model('Todo',todoSchema)


/**
 * Todo: Take care of lawn
 *  *subTodo: Mow the lawn
 *  *subTodo: Water the lawn
 *  *subTodo: Cut the grass
 *  *subTodo: Edge the lawn
 *  *subTodo: Rake the leaves
 *  *subTodo: Clean the gutters
 * 
 */