// Card designs for collections (the item a collection repeats per entry); the first is the default.
import type { CardPreset } from '../../../lib/site/extend';

export const CARDS: CardPreset[] = [
  {
    "id": "image",
    "label": "Image, title and excerpt",
    "description": "White card with the featured image on top.",
    "template": [
      {
        "type": "section",
        "props": {
          "attrs": {
            "gap": "0",
            "style": {
              "radius": "6px",
              "background": "var(--color-white)"
            },
            "layout": {
              "type": "stack"
            }
          },
          "children": [
            {
              "type": "entry-image",
              "props": {
                "attrs": {
                  "link": true,
                  "size": "medium_large",
                  "style": {
                    "radius": {
                      "topLeft": "6px",
                      "topRight": "6px",
                      "bottomLeft": "0px",
                      "bottomRight": "0px"
                    }
                  },
                  "imgWidth": "100%",
                  "aspectRatio": "1024/300"
                }
              }
            },
            {
              "type": "section",
              "props": {
                "attrs": {
                  "gap": "var(--space-20)",
                  "style": {
                    "padding": {
                      "top": "var(--space-50)",
                      "left": "var(--space-50)",
                      "right": "var(--space-50)",
                      "bottom": "var(--space-50)"
                    }
                  },
                  "layout": {
                    "type": "constrained"
                  }
                },
                "children": [
                  {
                    "type": "entry-title",
                    "props": {
                      "attrs": {
                        "link": true,
                        "level": 3,
                        "style": {
                          "color": "var(--color-night)",
                          "fontSize": "var(--text-large)",
                          "linkColor": "var(--color-night)",
                          "fontFamily": "var(--font-display)",
                          "fontWeight": "500"
                        }
                      }
                    }
                  },
                  {
                    "type": "entry-excerpt",
                    "props": {
                      "attrs": {
                        "style": {
                          "color": "var(--color-slate)",
                          "fontSize": "0.875rem",
                          "fontWeight": "300"
                        },
                        "length": 20,
                        "moreOnNewLine": false
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  },
  {
    "id": "event",
    "label": "Event card",
    "description": "Image, title, event dates and excerpt.",
    "template": [
      {
        "type": "section",
        "props": {
          "attrs": {
            "gap": "0",
            "style": {
              "radius": "6px",
              "background": "var(--color-white)"
            },
            "layout": {
              "type": "stack"
            }
          },
          "children": [
            {
              "type": "entry-image",
              "props": {
                "attrs": {
                  "link": true,
                  "size": "medium_large",
                  "style": {
                    "radius": {
                      "topLeft": "6px",
                      "topRight": "6px",
                      "bottomLeft": "0px",
                      "bottomRight": "0px"
                    }
                  },
                  "imgWidth": "100%",
                  "aspectRatio": "1024/300"
                }
              }
            },
            {
              "type": "section",
              "props": {
                "attrs": {
                  "gap": "var(--space-20)",
                  "style": {
                    "padding": {
                      "top": "var(--space-50)",
                      "left": "var(--space-50)",
                      "right": "var(--space-50)",
                      "bottom": "var(--space-50)"
                    }
                  },
                  "layout": {
                    "type": "constrained"
                  }
                },
                "children": [
                  {
                    "type": "entry-title",
                    "props": {
                      "attrs": {
                        "link": true,
                        "level": 3,
                        "style": {
                          "color": "var(--color-night)",
                          "fontSize": "var(--text-large)",
                          "linkColor": "var(--color-night)",
                          "fontFamily": "var(--font-display)",
                          "fontWeight": "500"
                        }
                      }
                    }
                  },
                  {
                    "type": "event-date",
                    "props": {
                      "attrs": {
                        "style": {
                          "color": "var(--color-copper)",
                          "fontSize": "0.75rem",
                          "fontWeight": "600",
                          "letterSpacing": "0.05em",
                          "textTransform": "uppercase"
                        },
                        "format": "M j, Y"
                      }
                    }
                  },
                  {
                    "type": "entry-excerpt",
                    "props": {
                      "attrs": {
                        "style": {
                          "color": "var(--color-slate)",
                          "fontSize": "0.875rem",
                          "fontWeight": "300"
                        },
                        "length": 20,
                        "moreOnNewLine": false
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  },
  {
    "id": "title",
    "label": "Title and date",
    "description": "A plain list of titles.",
    "template": [
      {
        "type": "section",
        "props": {
          "attrs": {
            "layout": {
              "type": "flow"
            },
            "gap": "var(--space-10)",
            "style": {
              "padding": {
                "bottom": "var(--space-30)"
              },
              "borderBottom": {
                "width": "1px",
                "style": "solid",
                "color": "rgba(26,26,46,0.1)"
              }
            }
          },
          "children": [
            {
              "type": "entry-title",
              "props": {
                "attrs": {
                  "link": true,
                  "level": 3,
                  "style": {
                    "fontSize": "var(--text-large)",
                    "fontFamily": "var(--font-display)",
                    "fontWeight": "400",
                    "color": "var(--color-night)",
                    "linkColor": "var(--color-night)"
                  }
                }
              }
            },
            {
              "type": "entry-date",
              "props": {
                "attrs": {
                  "style": {
                    "color": "var(--color-slate)",
                    "fontSize": "0.8125rem"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
];
