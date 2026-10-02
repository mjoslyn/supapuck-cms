/**
 * Navigation blocks (nav.c-nav, src/render/c/navigation.ts): the menu's panels and the search field.
 *
 * - Desktop: hover opens panel; focus opens panel; Escape closes; outside click closes.
 * - Mobile: hamburger toggles the list; tapping a top-level link with a panel
 *   opens the panel; a second tap follows the link.
 * - Search icon: opens a search field below the header and focuses it; Escape or
 *   an outside click closes it. Without this script the icon links to /search/.
 */
( function () {
	'use strict';

	var DESKTOP_MIN = 900;

	function ready( fn ) {
		if ( document.readyState !== 'loading' ) {
			fn();
		} else {
			document.addEventListener( 'DOMContentLoaded', fn );
		}
	}

	function isDesktop() {
		return window.matchMedia( '(min-width: ' + DESKTOP_MIN + 'px)' ).matches;
	}

	function init() {
		document.querySelectorAll( '.c-nav' ).forEach( setup );
	}

	function setup( nav ) {

		var toggle = nav.querySelector( '.c-nav__toggle' );
		var list   = nav.querySelector( '.c-nav__list' );
		var items  = nav.querySelectorAll( '.c-nav__item.has-panel' );
		var closeTimer = null;
		var CLOSE_DELAY_MS = 180;
		var searchToggle = nav.querySelector( '.c-nav__search-toggle' );
		var searchPanel  = searchToggle ? document.getElementById( searchToggle.getAttribute( 'aria-controls' ) ) : null;

		function setSearch( open, returnFocus ) {
			if ( ! searchToggle || ! searchPanel ) {
				return;
			}
			var wasOpen = ! searchPanel.hidden;
			searchPanel.hidden = ! open;
			searchToggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
			if ( open ) {
				var input = searchPanel.querySelector( 'input' );
				if ( input ) {
					input.focus();
					input.select();
				}
			} else if ( wasOpen && returnFocus ) {
				searchToggle.focus();
			}
		}

		if ( searchToggle && searchPanel ) {
			searchToggle.setAttribute( 'role', 'button' );
			searchToggle.addEventListener( 'keydown', function ( e ) {
				if ( e.key === ' ' ) {
					e.preventDefault();
					searchToggle.click();
				}
			} );
			searchToggle.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				var open = searchPanel.hidden;
				if ( open ) {
					closeAll();
					if ( toggle && nav.classList.contains( 'is-open' ) ) {
						nav.classList.remove( 'is-open' );
						toggle.setAttribute( 'aria-expanded', 'false' );
					}
				}
				setSearch( open, true );
			} );
		}

		function scheduleClose() {
			cancelClose();
			closeTimer = setTimeout( function () {
				closeAll();
				closeTimer = null;
			}, CLOSE_DELAY_MS );
		}
		function cancelClose() {
			if ( closeTimer ) {
				clearTimeout( closeTimer );
				closeTimer = null;
			}
		}

		// Mobile hamburger toggle.
		if ( toggle && list ) {
			toggle.addEventListener( 'click', function () {
				setSearch( false );
				var open = nav.classList.toggle( 'is-open' );
				toggle.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
				if ( ! open ) {
					closeAll();
				}
			} );
		}

		items.forEach( function ( item ) {
			var link  = item.querySelector( '.c-nav__link' );
			var panel = item.querySelector( '.c-nav__panel' );
			if ( ! link || ! panel ) {
				return;
			}

			// Desktop: open on hover. Use a small close delay so the cursor can
			// briefly leave the item bounds (e.g. crossing into the panel) without
			// triggering an immediate close. The hover bridge in CSS prevents most
			// of these excursions, this is defense-in-depth.
			item.addEventListener( 'mouseenter', function () {
				if ( isDesktop() ) {
					cancelClose();
					openItem( item );
				}
			} );
			item.addEventListener( 'mouseleave', function () {
				if ( isDesktop() ) {
					scheduleClose();
				}
			} );

			// Keyboard: open on focus-within.
			item.addEventListener( 'focusin', function () {
				if ( isDesktop() ) {
					openItem( item );
				}
			} );
			item.addEventListener( 'focusout', function ( e ) {
				if ( isDesktop() && ! item.contains( e.relatedTarget ) ) {
					closeItem( item );
				}
			} );

			// Click handling.
			//   - Desktop: let the link follow normally; the hover/focus already shows
			//     the panel, and the top-level link is itself a destination.
			//   - Mobile: first tap opens the panel, second tap follows the link.
			link.addEventListener( 'click', function ( e ) {
				if ( isDesktop() ) {
					return;
				}
				if ( ! item.classList.contains( 'is-open' ) ) {
					e.preventDefault();
					closeAll();
					openItem( item );
				}
			} );
		} );

		// Escape closes everything.
		document.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) {
				closeAll();
				setSearch( false, true );
				if ( toggle && nav.classList.contains( 'is-open' ) ) {
					nav.classList.remove( 'is-open' );
					toggle.setAttribute( 'aria-expanded', 'false' );
					toggle.focus();
				}
			}
		} );

		// Outside click closes everything.
		document.addEventListener( 'click', function ( e ) {
			if ( ! nav.contains( e.target ) ) {
				closeAll();
				setSearch( false );
			}
		} );

		function openItem( item ) {
			closeAll( item );
			item.classList.add( 'is-open' );
			var link  = item.querySelector( '.c-nav__link' );
			var panel = item.querySelector( '.c-nav__panel' );
			if ( link ) {
				link.setAttribute( 'aria-expanded', 'true' );
			}
			if ( panel ) {
				panel.removeAttribute( 'hidden' );
			}
		}

		function closeItem( item ) {
			item.classList.remove( 'is-open' );
			var link  = item.querySelector( '.c-nav__link' );
			var panel = item.querySelector( '.c-nav__panel' );
			if ( link ) {
				link.setAttribute( 'aria-expanded', 'false' );
			}
			if ( panel ) {
				panel.setAttribute( 'hidden', '' );
			}
		}

		function closeAll( except ) {
			items.forEach( function ( item ) {
				if ( item !== except ) {
					closeItem( item );
				}
			} );
		}
	}

	ready( init );
} )();
