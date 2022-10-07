import * as React from "react";
import { Account } from "../../../../models/account";
import Tooltip from "../../../common/Tooltip";
import { CsvCreateTransaction } from "../importModels";

interface Props {
    transaction: CsvCreateTransaction
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } }
}

export default function AutoIdentifier (props: Props): React.ReactElement {
    const identifier = formatAccount(props.transaction.source) + "→" + formatAccount(props.transaction.destination) +
        "|" + props.transaction.dateTime.toString() +
        "|" + props.transaction.amount.toString() +
        "|" + props.transaction.description;

    return <Tooltip content={identifier}>
        auto
    </Tooltip>;
}

function formatAccount (account: Account | "fetching" | null): string {
    if (account === "fetching") return "?";
    if (account === null) return ".";
    return account.id.toString();
}
