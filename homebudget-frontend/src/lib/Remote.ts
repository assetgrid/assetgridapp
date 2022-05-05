export enum RemoteState {
    /**
     * A new value is being created at the remote source
     */
    Creating,

    /**
     * The remote object is currently being deleted
     */
    Deleting,

    /**
     * The value at the remote source is being updated
     */
    Updating,

    /**
     * A new value is being fetched from the remote source
     */
    Fetching,

    /**
     * A value has been fetched from the remote source
     */
    HasValue,

    /**
     * No value has been fetched from the remote source
     */
    NoValue,

    /**
     * An error occured during the action
     */
    Error,
}

type Remote<T, E> = IValueRemote<T> | IEmptyRemote | IOptionalValueRemote<T> | IErrorRemote<T, E>;
export default Remote;

export function IsFetched<T, E>(remote: Remote<T, E>): remote is IValueRemote<T> {
    return (remote.state !== RemoteState.NoValue
            && remote.state !== RemoteState.Fetching
            && remote.state !== RemoteState.Error);
}

/**
 * Returns the value of the remote if available
 * Otherwise returns undefined
 */
export function GetRemoteValue<T, E>(remote: Remote<T, E>): T | undefined {
    switch (remote.state) {
        case RemoteState.NoValue:
            return undefined;
        default:
            return remote.value;
    }
}

export interface IValueRemote<T> {
    /**
     * Whether a new value is currently being fetched from the remote source
     */
    state: RemoteState.Creating | RemoteState.Deleting | RemoteState.HasValue | RemoteState.Updating;

    /**
     * The latest value. Value can only be undefined while it is fetching for the first time.
     * If isFetching is false, this value is up to date.
     * If isFetching is true, a newer value is being received from the remote source.
     */
    value: T;
}

export interface IOptionalValueRemote<T> {
    /**
     * Whether a new value is currently being fetched from the remote source
     */
    state: RemoteState.Fetching;

    /**
     * The latest value. Value can only be undefined while it is fetching for the first time.
     * If isFetching is false, this value is up to date.
     * If isFetching is true, a newer value is being received from the remote source.
     */
    value?: T;
}

export interface IEmptyRemote {
    /**
     * Whether a new value is currently being fetched from the remote source
     */
    state: RemoteState.NoValue;
}

export interface IErrorRemote<ValueType, ErrorType> {
    /**
     * Whether a new value is currently being fetched from the remote source
     */
    state: RemoteState.Error;
    value?: ValueType;
    error?: ErrorType;
}
