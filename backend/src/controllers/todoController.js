const Todo = require("../models/Todo");

const createTodo = async (req, res) => {
  const { title, description, tags } = req.body;

  try {
    // Validate that at least one tag is provided
    if (!tags || tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }

    const addTodo = await Todo.create({ title, description, tags });
    res.status(201).send(addTodo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);

    if (deletedTodo) {
      res.status(200).send({ message: "Todo deleted" });
    } else {
      res.status(404).send({ message: "Todo not found" });
    }
  } catch (err) {
    console.error(err);
  }
};

const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find().populate('tags');
    res.status(200).send(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    res.status(500).send({ message: "Internal server error" });
  }
}

const updateTodo = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    // Validate that at least one tag is provided if tags are being updated
    if (updates.tags && updates.tags.length === 0) {
      return res.status(400).send({ message: "At least one tag is required" });
    }
    
    const data = await Todo.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate('tags')
    if (data != null) {
      res.status(200).send(data)
    } else {
      res.status(404).send({ message: "Todo not found" })
    }
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: "Internal server error" })
  }
}

const getTotalTasks = async (req,res) => {

  try {
    const count = await Todo.countDocuments();
    res.status(200).send({totalTasks:count})
  }catch(err) {
    console.error(err)
    res.status(500).send(err)
  }
}

module.exports = {
  createTodo,
  getTodos,
  deleteTodo,
  updateTodo,
  getTotalTasks
};
