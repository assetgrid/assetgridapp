import * as React from "react";
import Card from "../common/Card";

export default function () {
    return <>
        <section className="hero has-background-danger" style={{ flexDirection: "row", alignItems: "center" }}>
            <div className="hero-body">
                <p className="title has-text-white">
                    An error occurred
                </p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Error" isNarrow={true}>
                <p>An unknown error occured.</p>
            </Card>
        </div>
    </>;
}