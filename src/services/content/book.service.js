const Book = require('../../model/content/book.model');
const { makeCrudService } = require('./crud.factory');

module.exports = class BookService extends makeCrudService(Book, { createdAt: -1 }) {};
