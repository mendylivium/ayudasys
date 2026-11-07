// Package console implements Forge, the project's CLI:
//
//	./forge <command> [args]     (or: go run . <command> [args])
package console

import (
	"fmt"
	"os"
	"sort"
	"strings"
)

// Command is a CLI command.
type Command struct {
	Name        string
	Usage       string
	Description string
	Run         func(args []string) error
}

var commands = map[string]Command{}

func register(c Command) { commands[c.Name] = c }

// Run executes the command named by args[0] (default "serve").
func Run(args []string) int {
	name := "serve"
	if len(args) > 0 {
		name, args = args[0], args[1:]
	}
	if name == "help" || name == "-h" || name == "--help" || name == "list" {
		printHelp()
		return 0
	}

	cmd, ok := commands[name]
	if !ok {
		fmt.Fprintf(os.Stderr, "Command %q is not defined.\n\n", name)
		printHelp()
		return 1
	}
	if _, ok := flag(args, "help"); ok {
		fmt.Printf("\033[33mDescription:\033[0m\n  %s\n\n\033[33mUsage:\033[0m\n  ./forge %s\n", cmd.Description, cmd.Usage)
		return 0
	}
	if err := cmd.Run(args); err != nil {
		fmt.Fprintf(os.Stderr, "\033[31mERROR\033[0m %v\n", err)
		return 1
	}
	return 0
}

func printHelp() {
	fmt.Println("\033[32mGoMVC Forge\033[0m")
	fmt.Println()
	fmt.Println("\033[33mUsage:\033[0m")
	fmt.Println("  ./forge <command> [arguments]      (Windows: forge <command>)")
	fmt.Println("  ./forge <command> --help")
	fmt.Println()
	fmt.Println("\033[33mAvailable commands:\033[0m")

	groupOf := func(name string) string {
		g, _, found := strings.Cut(name, ":")
		if !found {
			return ""
		}
		return g
	}

	names := make([]string, 0, len(commands))
	for n := range commands {
		names = append(names, n)
	}
	sort.Slice(names, func(i, j int) bool {
		gi, gj := groupOf(names[i]), groupOf(names[j])
		if gi != gj {
			return gi < gj
		}
		return names[i] < names[j]
	})

	group := ""
	for _, n := range names {
		c := commands[n]
		if g := groupOf(n); g != group {
			group = g
			fmt.Printf(" \033[33m%s\033[0m\n", g)
		}
		fmt.Printf("  \033[32m%-36s\033[0m %s\n", c.Usage, c.Description)
	}
}

// flag returns the value of --name=value, or "" (and whether it is present).
func flag(args []string, name string) (string, bool) {
	for _, a := range args {
		if a == "--"+name {
			return "", true
		}
		if v, ok := strings.CutPrefix(a, "--"+name+"="); ok {
			return v, true
		}
	}
	return "", false
}

// options collects boolean flags: long ones (--migration) and bundled short
// ones (-mcr), which are mapped to their long names through short.
func options(args []string, short map[rune]string) map[string]bool {
	out := map[string]bool{}
	for _, a := range args {
		if long, ok := strings.CutPrefix(a, "--"); ok {
			name, _, _ := strings.Cut(long, "=")
			out[name] = true
			continue
		}
		if letters, ok := strings.CutPrefix(a, "-"); ok {
			for _, r := range letters {
				if name, ok := short[r]; ok {
					out[name] = true
				}
			}
		}
	}
	return out
}

// positional returns the arguments that are not --flags.
func positional(args []string) []string {
	var out []string
	for _, a := range args {
		if !strings.HasPrefix(a, "-") {
			out = append(out, a)
		}
	}
	return out
}

func info(format string, a ...any) {
	fmt.Printf("  \033[34mINFO\033[0m "+format+"\n", a...)
}

func done(format string, a ...any) {
	fmt.Printf("  \033[32mDONE\033[0m "+format+"\n", a...)
}
