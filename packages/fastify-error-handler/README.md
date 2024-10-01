# Fastify Error Handler

This error handler package's goal is to standardize the management of the errors across Fastify services.

## How to use it

To use this package 2 steps are needed:
- install the package with
```
npm i @ogcio/fastify-error-handler
```

- use the `initializeErrorHandler(server)` method to set the error handlers for the `fastify` server

That's it!

## How to raise errors

To standardize error handling in the Fastify services, the suggested way to go is to raise exceptions by using the `HttpError` errors from the [fastify-sensible](https://github.com/fastify/fastify-sensible) package.

It exposes some predefined error types

```
import { httpErrors } from "@fastify/sensible";
......
// predefined error
throw httpErrors.notFound("Route not found");

// custom error
throw httpErrors.createError(404, "message", {additional: {data: "here"}});
```

The `error-handler` package is ready to manage the errors, log them and transform them in the output HTTP error you need.
