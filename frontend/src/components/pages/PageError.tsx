import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import Card from "../common/Card";
import Hero from "../common/Hero";

export default function PageError (): React.ReactElement {
    const { t } = useTranslation();
    return <>
        <Hero title={t("common.error")} subtitle={t("common.error_occured")} isDanger={true} />
        <div className="p-3">
            <Card title={t("common.error")!} isNarrow={true}>
                <Trans i18nKey="common.error_page_text">
                    <p>An unknown error occured.</p>
                    <p>If you believe that this is a bug you can report it on our <a href="https://github.com/Assetgrid/assetgridapp/issues/new?assignees=alex6480&labels=bug&template=bug_report.md&title=" target="_blank" rel="noreferrer">Github page</a></p>
                </Trans>
            </Card>
        </div>
    </>;
}
