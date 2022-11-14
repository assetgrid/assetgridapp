import * as React from "react";
import Card from "../common/Card";
import Hero from "../common/Hero";
import Image404 from "../../assets/404.svg";
import { useTranslation } from "react-i18next";

export default function Page404 (): React.ReactElement {
    const { t } = useTranslation();

    return <>
        <Hero title={t("common.page_not_found_long")} subtitle={t("common.requested_page_not_found")} isDanger={true} />
        <div className="p-3">
            <Card title={t("common.not_found")!} isNarrow={true}>
                <p>{t("common.page_not_found_long")}</p>

                <div style={{ textAlign: "center" }}>
                    <img src={Image404} style={{ maxWidth: "400px", display: "inline-block" }} />
                    <div>
                        <a href="https://www.freepik.com/free-vector/oops-404-error-with-broken-robot-concept-illustration_13315300.htm#query=404&position=2&from_view=keyword">Image by storyset</a> on Freepik
                    </div>
                </div>
            </Card>
        </div>
    </>;
}
