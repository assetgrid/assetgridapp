export type Ok<T> = {
    status: 200;
    data: T;
}

export type NotFound = {
    status: 404;
}

export const NotFoundResult = {
    status: 404,
} as const;

export type Forbid = {
    status: 403;
}

export const ForbidResult = {
    status: 403
} as const;

export type BadRequest = {
    status: 400;
    title: string;
    errors: { [key: string]: string[] };
}