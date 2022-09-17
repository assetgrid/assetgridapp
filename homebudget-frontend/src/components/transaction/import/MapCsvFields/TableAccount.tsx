import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React = require("react");
import { Account } from "../../../../models/account";
import AccountLink from "../../../account/AccountLink";
import Tooltip from "../../../common/Tooltip";
import InputButton from "../../../input/InputButton";
import { AccountReference } from "../ImportModels";

interface Props {
    reference: AccountReference | null;
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } };
    beginCreatingAccount: (accountReference: AccountReference) => void;
}

export default function TableAccount(props: Props): React.ReactElement {
    if (props.reference === null) {
        return <></>;
    }

    let account = props.accountsBy[props.reference.identifier] ?
        props.accountsBy[props.reference.identifier][props.reference.value] ?? null
        : null;
    if (account === "fetching") {
        return <Tooltip content={"Fetching account with " + props.reference.identifier + ": " + props.reference.value}>
            &hellip;
        </Tooltip>;
    }
    if (account === null) {
        return <Tooltip content={<>
                No account found with {props.reference.identifier}: {props.reference.value}
                <InputButton onClick={() => props.beginCreatingAccount(props.reference!)} className="is-small">
                    Create Account
                </InputButton>
            </>}>
            <span className="icon has-text-danger">
                <FontAwesomeIcon icon={faExclamationTriangle} />
            </span>
            Not found
        </Tooltip>;
    };

    return <AccountLink account={account} targetBlank={true} />;
}