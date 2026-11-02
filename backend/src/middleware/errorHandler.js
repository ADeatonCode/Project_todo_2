export  function errorHandler(err, req, res, next) {
if(err.name === "ValidationError") 
   {res.status(400).json({ "message": err.message});
}

else if (err.name === "CastError"&& err.kind === "ObjectId" ) {res.status(400) .json({ "message": "Resource not found"})} 
   else { console.log(err.stack) 
    res.status(500).json({ "message": "Internal Server Error"})}
    next()
}