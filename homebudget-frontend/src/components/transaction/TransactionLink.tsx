import React = require("react");
import { Transaction } from "../../models/transaction";
import Tooltip from "../common/Tooltip";

export default function TransactionLink(props: { transaction: Transaction, disabled?: boolean }) {
    if (props.disabled) {
        return <span className="transaction-link">
            <span>#</span>{props.transaction.id}
        </span>;
    }

    if (props.transaction.identifier === null) {
        return <a className="transaction-link">
            <span>#</span>{props.transaction.id}
        </a>;
    } else {
        return <Tooltip content={<>
            <span>Identifier: </span> {props.transaction.identifier}. Click to go to transaction.
        </>}>
            <a className="transaction-link">
                <span>#</span>{props.transaction.id}
            </a>
        </Tooltip>;
    }
}