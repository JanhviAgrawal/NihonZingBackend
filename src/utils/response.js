module.exports.successResponse = (status, error = false, message, result) => ({
    status,
    error,
    message,
    result
});
module.exports.errorResponse = (status = 500, error = true, message) => ({
    status,
    error,
    message
});