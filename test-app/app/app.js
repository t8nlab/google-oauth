import t from "@titanpl/route";

t.get("/call").action("callback")
t.get("/v").action("verify")

t.get("/email").action("email")
t.get("/download").action("download")
t.get("/refresh").action("refresh")
t.get("/").action("login")

t.start(5100, "Titan Running!");
