package api

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/app/policies"
	"go-mvc/pkg/response"
)

type PostController struct {
	db *gorm.DB
}

func NewPostController(db *gorm.DB) *PostController {
	return &PostController{db: db}
}

// GET /api/posts
func (p *PostController) Index(c fiber.Ctx) error {
	var posts []models.Post
	if err := p.db.Scopes(models.Published, models.WithAuthor).Order("created_at DESC").Find(&posts).Error; err != nil {
		return response.InternalError(c, "Failed to load posts")
	}
	return response.OK(c, "Posts retrieved", posts)
}

// GET /api/posts/:id (published posts only)
func (p *PostController) Show(c fiber.Ctx) error {
	post, ok := p.find(c, true)
	if !ok || !post.Published {
		return response.NotFound(c, "Post not found")
	}
	return response.OK(c, "Post retrieved", post)
}

// POST /api/posts
func (p *PostController) Store(c fiber.Ctx) error {
	var req requests.StorePostRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}
	post := models.Post{
		Title:     req.Title,
		Body:      req.Body,
		Published: req.Published,
		UserID:    auth.User(c).ID,
	}
	if err := p.db.Create(&post).Error; err != nil {
		return response.InternalError(c, "Failed to create post")
	}
	return response.Created(c, "Post created", post)
}

// PUT /api/posts/:id
func (p *PostController) Update(c fiber.Ctx) error {
	post, ok := p.find(c, false)
	if !ok {
		return response.NotFound(c, "Post not found")
	}
	if !policies.UpdatePost(auth.User(c), post) {
		return response.Forbidden(c, "You cannot edit this post")
	}

	var req requests.UpdatePostRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}
	if req.Title != nil {
		post.Title = *req.Title
	}
	if req.Body != nil {
		post.Body = *req.Body
	}
	if req.Published != nil {
		post.Published = *req.Published
	}
	if err := p.db.Save(post).Error; err != nil {
		return response.InternalError(c, "Failed to update post")
	}
	return response.OK(c, "Post updated", post)
}

// DELETE /api/posts/:id
func (p *PostController) Destroy(c fiber.Ctx) error {
	post, ok := p.find(c, false)
	if !ok {
		return response.NotFound(c, "Post not found")
	}
	if !policies.DeletePost(auth.User(c), post) {
		return response.Forbidden(c, "You cannot delete this post")
	}
	if err := p.db.Delete(post).Error; err != nil {
		return response.InternalError(c, "Failed to delete post")
	}
	return response.OK(c, "Post deleted", nil)
}

func (p *PostController) find(c fiber.Ctx, withUser bool) (*models.Post, bool) {
	id, ok := paramID(c)
	if !ok {
		return nil, false
	}
	q := p.db
	if withUser {
		q = q.Scopes(models.WithAuthor)
	}
	var post models.Post
	if err := q.First(&post, id).Error; err != nil {
		return nil, false
	}
	return &post, true
}
