package events

import (
	"sync"

	"github.com/erp-portal/go-backend/internal/core/logger"
)

// Event carries a typed name and arbitrary payload.
type Event struct {
	Name    string
	Payload interface{}
}

// Handler is a function that processes an event.
type Handler func(Event)

// Bus is a simple in-process pub/sub dispatcher.
// Handlers run in a goroutine (fire-and-forget).
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

var Global = &Bus{handlers: make(map[string][]Handler)}

// Subscribe registers a handler for an event name.
func (b *Bus) Subscribe(name string, h Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[name] = append(b.handlers[name], h)
}

// Publish dispatches an event to all registered handlers asynchronously.
func (b *Bus) Publish(name string, payload interface{}) {
	b.mu.RLock()
	hs := make([]Handler, len(b.handlers[name]))
	copy(hs, b.handlers[name])
	b.mu.RUnlock()

	if len(hs) == 0 {
		return
	}
	ev := Event{Name: name, Payload: payload}
	for _, h := range hs {
		h := h
		go func() {
			defer func() {
				if r := recover(); r != nil {
					logger.Error().Interface("panic", r).Str("event", name).Msg("event handler panic")
				}
			}()
			h(ev)
		}()
	}
}

// Convenience wrappers on the global bus.
func Subscribe(name string, h Handler) { Global.Subscribe(name, h) }
func Publish(name string, payload interface{}) { Global.Publish(name, payload) }
