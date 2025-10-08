describe('RBAC happy paths', () => {
  it('Admin login → can view prescriptions list but no "New Prescription" button', () => {
    cy.visit('/login');
    cy.get('input[name=email]').type('admin@example.com');
    cy.get('input[name=password]').type('adminpass{enter}');
    cy.url().should('include', '/admin/dashboard');
    cy.visit('/prescriptions');
    cy.findByRole('button', { name: /new prescription/i }).should('not.exist');
  });

  it('Vet login → can create prescription', () => {
    cy.loginAs('vet');
    cy.visit('/prescriptions/new');
    cy.get('[name=petId]').type('Fluffy');
    cy.get('[name=medName]').type('Amoxy');
    cy.findByRole('button', { name: /save/i }).click();
    cy.contains(/created|saved/i).should('be.visible');
  });

  it('Owner login → /appointments/mine only', () => {
    cy.loginAs('owner');
    cy.visit('/appointments');
    cy.contains(/my appointments/i).should('be.visible');
    cy.findByRole('button', { name: /edit/i }).should('not.exist');
  });
});
