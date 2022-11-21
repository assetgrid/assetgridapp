import * as React from "react";
import Card from "../../common/Card";
import AccountList from "../../account/AccountList";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import Hero from "../../common/Hero";
import { SearchGroupType, SearchOperator } from "../../../models/search";
import { Trans, useTranslation } from "react-i18next";

export default function PageAccountOverview (): React.ReactElement {
    const { t } = useTranslation();

    return <>
        <Hero title={t("common.accounts")} subtitle={t("account.manage_accounts")} />
        <div className="p-3">
            <Card title={t("common.actions")!} isNarrow={true}>
                <Link to={routes.accountCreate()} state={{ allowBack: true }} className="button is-primary">
                    {t("common.create_account")}
                </Link>
            </Card>
            <Card title={t("account.your_accounts_in_net_worth")!} isNarrow={true}>
                <AccountList query={{
                    type: SearchGroupType.Query,
                    query: {
                        column: "IncludeInNetWorth",
                        value: true,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                }} />
            </Card>
            <Card title={<Trans i18nKey="account.offset_not_in_net_worth">
                Offset accounts (<span style={{ textDecoration: "underline" }}>not</span>&nbsp;included in net worth)
            </Trans>} isNarrow={true}>
                <AccountList query={{
                    type: SearchGroupType.Query,
                    query: {
                        column: "IncludeInNetWorth",
                        value: false,
                        operator: SearchOperator.Equals,
                        not: false,
                        metaData: false
                    }
                }} />
            </Card>
        </div>
    </>;
}
