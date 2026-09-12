const mongoose = require("mongoose");

// Generic, admin-editable content store for any configurable page/section
// (landing page today, more pages later) without a schema change per page.
// `content` is an open JSON blob whose shape is agreed between the admin
// form and the page that renders it (see intro page defaults on the
// frontend's pageContentDefaults.ts).
const PageContentSchema = new mongoose.Schema({
    pageKey: { type: String, required: true, unique: true, trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model("PageContent", PageContentSchema, "PageContent");
