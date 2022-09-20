import * as React from "react";
import Card from "../common/Card";

export default function () {
    return <>
        <section className="hero has-background-grey" style={{ flexDirection: "row", alignItems: "center" }}>
            <div className="hero-body">
                <p className="title has-text-white">
                    Page not found
                </p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Not found" isNarrow={true}>
                <p>The page you requested could not be found.</p>
            </Card>
        </div>
    </>;
}