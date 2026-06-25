// Self-uninstalling service worker to clean up any stale registrations
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  self.registration.unregister()
    .then(function() {
      return self.clients.matchAll();
    })
    .then(function(clients) {
      clients.forEach(function(client) {
        if (client.navigate) {
          client.navigate(client.url);
        }
      });
    });
});

// Do NOT intercept any fetch requests - let everything pass through naturally to the network
