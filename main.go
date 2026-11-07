// GoMVC entry point — the Forge CLI. Run `./forge list` for commands;
// with no arguments it starts the HTTP server.
package main

import (
	"os"

	"go-mvc/app/console"
)

func main() {
	os.Exit(console.Run(os.Args[1:]))
}
