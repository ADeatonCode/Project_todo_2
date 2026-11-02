const mongoose = require("mongoose")

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    color: { type: String, default: "#2196f3" },
    description: { type: String, default: "", select: false },
}, {
    timestamps: true
})

module.exports = mongoose.model('Tag', tagSchema)


// Come back to the meeting with the following:
// 2 new properties that can be used in a field

/**
 * Kevin
 * 1. min/max -- sets min and max length of a field
 * 2. immutable -- sets a field to be immutable. CANNOT be changed after creation
 */

/**
 * Alan
 * 1. alias -- allows you to use a different name for a field in the database
 * 2. select: false -- allows you to exclude a field from the response
 */

/**
 * Michael
 * 1. isActive -- allows you to set a field to be active or inactive
 * 2. createdAt/updatedAt -- allows you to set a field to be created at and updated at
 */

/**
 * Ryan
 * 1. match -- allows you to set a regex pattern for a field
 * 2. select: false -- allows you to exclude a field from the response
 */