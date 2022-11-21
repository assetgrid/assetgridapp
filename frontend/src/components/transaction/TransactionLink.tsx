import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Transaction } from "../../models/transaction";
import Tooltip from "../common/Tooltip";

export default function TransactionLink (props: { transaction: Transaction, disabled?: boolean }): React.ReactElement {
    const { t } = useTranslation();

    if (props.disabled === true) {
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
            <span>{t("transaction.identifiers_colon")}</span> {props.transaction.identifiers.join(", ")}. {t("transaction.click_go_to_transaction")}.
        </>}>
            <Link className="transaction-link" to={routes.transaction(props.transaction.id.toString())}>
                <span>#</span>{props.transaction.id}
            </Link>
        </Tooltip>;
    }
}
