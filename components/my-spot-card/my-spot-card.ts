

// components/spot-card/spot-card.ts
Component({
  properties: {
    spot: {
      type: Object,
      value: {},
    },
    navIcon: { type: String, value: "https://icons.unistar.icu/icons/nav.png" },
  },

  
  methods: {
    handleCardTap() {
      const spot = this.data.spot
      this.triggerEvent("navigateToDetail", { id: spot.id });
    },

    handleNavTap() {
      const spot = this.data.spot
      this.triggerEvent("navigateToSpot", { id: spot.id });
    },
  },
});
