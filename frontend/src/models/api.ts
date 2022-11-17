export interface Ok<T> {
    status: 200
    data: T
}

export interface NotFound {
    status: 404
}

export const NotFoundResult = {
    status: 404
} as const;

export interface Forbid {
    status: 403
}

export const ForbidResult = {
    status: 403
} as const;

export interface BadRequest {
    status: 400
    title: string
    errors: { [key: string]: string[] }
}

export interface Unauthorized {
    status: 401
}
export const UnauthorizedResult = {
    status: 401
} as const;

export type HttpErrorResult = | NotFound | Forbid | BadRequest | Unauthorized;
