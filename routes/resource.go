package routes

import "github.com/gofiber/fiber/v3"

// ResourceController has the seven actions of a Laravel resource controller.
type ResourceController interface {
	Index(c fiber.Ctx) error
	Create(c fiber.Ctx) error
	Store(c fiber.Ctx) error
	Show(c fiber.Ctx) error
	Edit(c fiber.Ctx) error
	Update(c fiber.Ctx) error
	Destroy(c fiber.Ctx) error
}

// APIResourceController is a resource controller without the HTML form pages.
type APIResourceController interface {
	Index(c fiber.Ctx) error
	Store(c fiber.Ctx) error
	Show(c fiber.Ctx) error
	Update(c fiber.Ctx) error
	Destroy(c fiber.Ctx) error
}

// Resource registers the conventional routes, like Laravel's Route::resource:
//
//	GET    /path            Index
//	GET    /path/create     Create
//	POST   /path            Store
//	GET    /path/:id        Show
//	GET    /path/:id/edit   Edit
//	PUT    /path/:id        Update
//	DELETE /path/:id        Destroy
//
// Middleware (e.g. mw.Authenticate()) applies to every route.
func Resource(r fiber.Router, path string, c ResourceController, middleware ...fiber.Handler) {
	add := adder(r, middleware)
	add(fiber.MethodGet, path, c.Index)
	add(fiber.MethodGet, path+"/create", c.Create) // before /:id
	add(fiber.MethodPost, path, c.Store)
	add(fiber.MethodGet, path+"/:id", c.Show)
	add(fiber.MethodGet, path+"/:id/edit", c.Edit)
	add(fiber.MethodPut, path+"/:id", c.Update)
	add(fiber.MethodDelete, path+"/:id", c.Destroy)
}

// APIResource registers Index, Store, Show, Update and Destroy (Route::apiResource).
func APIResource(r fiber.Router, path string, c APIResourceController, middleware ...fiber.Handler) {
	add := adder(r, middleware)
	add(fiber.MethodGet, path, c.Index)
	add(fiber.MethodPost, path, c.Store)
	add(fiber.MethodGet, path+"/:id", c.Show)
	add(fiber.MethodPut, path+"/:id", c.Update)
	add(fiber.MethodDelete, path+"/:id", c.Destroy)
}

func adder(r fiber.Router, middleware []fiber.Handler) func(method, path string, h fiber.Handler) {
	return func(method, path string, h fiber.Handler) {
		handlers := make([]any, 0, len(middleware)+1)
		for _, m := range middleware {
			handlers = append(handlers, m)
		}
		handlers = append(handlers, h)
		r.Add([]string{method}, path, handlers[0], handlers[1:]...)
	}
}
