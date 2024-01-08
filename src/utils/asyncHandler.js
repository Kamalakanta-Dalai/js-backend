//? This is Promise based asyncHandler
const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = () => {}
// const asyncHandler = (func) => {() => {}}   //!we can remove the curly braces
// const asyncHandler = (func) => async () => {}  //!To make it async

//? This is the asyncHander method but using 'try n catch'
// This is basically a template for async methods with error handling

// const asyncHandler = (fn) => {
//   async (req, res, next) => {
//     try {
//       await fn(req, res, next);
//     } catch (error) {
//       res.status(err.code || 500).json({
//         success: false,
//         message: err.message,
//       });
//     }
//   };
// };
