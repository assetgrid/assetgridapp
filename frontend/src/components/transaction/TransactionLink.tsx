import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Transaction } from "../../models/transaction";
import Tooltip from "../common/Tooltip";

export default function TransactionLink(props: { transaction: Transaction, disabled?: boolean }) {
    if (props.disabled) {
        return <span className="transaction-link">
            <span>#</span>{props.transaction.id}
        </span>;
    }

    if (props.transaction.identifiers.length === 0) {
        return <Link className="transaction-link" to={routes.transaction(props.transaction.id.toString())}>
            <span>#</span>{props.transaction.id}
        </Link>;
    } else {
        return <Tooltip content={<>
            <span>Identifiers: </span> {props.transaction.identifiers.join(", ")}. Click to go to transaction.
        </>}>
            <Link className="transaction-link" to={routes.transaction(props.transaction.id.toString())}>
                <span>#</span>{props.transaction.id}
            </Link>
        </Tooltip>;
    }
}