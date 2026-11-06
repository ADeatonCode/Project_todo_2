/*
 * This file creates, lists, updates, and deletes tags (color labels for tasks).
 * Tag names must be unique. Error 11000 means that name is already taken.
 */
const Tag = require("../models/Tag");

// Make a new color label. Duplicate names are rejected.
const createTag = async (req, res) => {
  const { name, color, description } = req.body;

  try {
    const addTag = await Tag.create({ name, color, description });
    res.status(201).send(addTag);
  } catch (error) {
    console.error("Error creating tag:", error);
    if (error.code === 11000) {
      res.status(400).send({ message: "Tag name already exists" });
    } else {
      res.status(500).send({ message: "Internal server error" });
    }
  }
};

// Remove one tag by id.
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTag = await Tag.findByIdAndDelete(id);

    if (deletedTag) {
      res.status(200).send({ message: "Tag deleted" });
    } else {
      res.status(404).send({ message: "Tag not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
};

// Return every tag so the website can show the color chips.
const getTags = async (req, res) => {
  try {
    const tags = await Tag.find();
    res.status(200).send(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).send({ message: "Internal server error" });
  }
}

// Change a tag's name, color, or description.
const updateTag = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const data = await Tag.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    if (data != null) {
      res.status(200).send(data)
    } else {
      res.status(404).send({ message: "Tag not found" })
    }
  } catch (error) {
    console.error(error)
    if (error.code === 11000) {
      res.status(400).send({ message: "Tag name already exists" });
    } else {
      res.status(500).send({ message: "Internal server error" });
    }
  }
}

// Find one tag by its id.
const getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);
    if (tag) {
      res.status(200).send(tag);
    } else {
      res.status(404).send({ message: "Tag not found" });
    }
  } catch (error) {
    console.error("Error fetching tag:", error);
    res.status(500).send({ message: "Internal server error" });
  }
}

module.exports = {
  createTag,
  getTags,
  deleteTag,
  updateTag,
  getTagById
}; 